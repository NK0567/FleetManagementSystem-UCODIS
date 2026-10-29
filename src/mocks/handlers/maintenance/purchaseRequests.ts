import {
  leadTimeDays,
  purchaseRequestStatus
} from '@/modules/maintenance/purchase-requests/domain/purchaseRequest'
import type { PurchaseRequestApi } from '@/modules/maintenance/purchase-requests/types/purchaseRequest.types'
import { isWorkable, workOrderStatus } from '@/modules/maintenance/work-orders/domain/workOrder'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { PurchaseRequestRow } from '../../fixtures/maintenance/purchaseRequests'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readNumber, readString } from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { MAINTENANCE_MESSAGES } from './messages'
import { addMovement } from './stockLedger'
import { openDowntime } from './workOrders'

/** Shortest reason accepted for a cancellation. */
const MIN_REASON = 10

export function purchaseRequestsApi(db: MockDatabase): PurchaseRequestApi[] {
  const items = new Map(db.stockItems.all().map((item) => [item.no, item.name]))
  const suppliers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const orders = new Map(db.workOrders.all().map((order) => [order.no, order.vehicleNo]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  return db.purchaseRequests.all().map((row) => {
    const vehicleNo = row.workOrderNo ? orders.get(row.workOrderNo) : undefined
    return {
      ...row,
      itemName: row.itemNo ? (items.get(row.itemNo) ?? row.itemNo) : '',
      supplierName: row.supplierNo ? (suppliers.get(row.supplierNo) ?? row.supplierNo) : '',
      vehiclePlate: vehicleNo ? (plates.get(vehicleNo) ?? vehicleNo) : '',
      leadTimeDays: leadTimeDays(row.orderedAt, row.receivedAt),
      status: purchaseRequestStatus(row)
    }
  })
}

export function registerPurchaseRequestsHandlers(router: MockRouter, db: MockDatabase): void {
  const respond = (no: string) => ok(purchaseRequestsApi(db).find((row) => row.no === no))

  function workableOrder(no: string) {
    const order = db.workOrders.findOrFail(no)
    const status = workOrderStatus({ ...order, diagnosedAt: order.diagnosis?.at ?? null })
    if (!isWorkable(status)) throw conflict(MAINTENANCE_MESSAGES.workOrderNotWorkable)
    return order
  }

  function inStatus(no: string, status: PurchaseRequestApi['status']) {
    const row = db.purchaseRequests.findOrFail(no)
    if (purchaseRequestStatus(row) !== status) {
      throw conflict(MAINTENANCE_MESSAGES.purchaseRequestWrongStatus)
    }
    return row
  }

  /** The order's line for this request, rewritten or dropped. */
  function updateOrderLine(
    row: PurchaseRequestRow,
    change: (line: { receivedAt: string | null; unitPrice: number }) => object | null,
    request: MockRequest
  ) {
    const order = row.workOrderNo ? db.workOrders.find(row.workOrderNo) : undefined
    if (!order) return
    const parts = order.parts.flatMap((part) => {
      if (part.purchaseRequestNo !== row.no) return [part]
      const next = change(part)
      return next ? [{ ...part, ...next }] : []
    })
    db.workOrders.update(order.no, { parts, ...stampModified(request) })
  }

  registerCrudResource(router, {
    basePath: '/maintenance/purchase-requests',
    feature: 'PURCHASEREQUEST',
    collection: db.purchaseRequests,
    list: () => purchaseRequestsApi(db),
    searchColumns: ['no', 'label', 'workOrderNo', 'supplierName'],
    optionFields: { status: 'purchaseRequestStatus' },
    create: (input, request) => {
      const itemNo = optionalReference(db.stockItems, input, 'itemNo')
      const item = itemNo ? db.stockItems.findOrFail(itemNo) : undefined
      const label = readString(input, 'label') || item?.name || ''
      if (!label) throw unprocessable(MAINTENANCE_MESSAGES.purchaseLabelMissing)
      const quantity = readNumber(input, 'quantity', { required: true, min: 1 }) ?? 0
      if (!Number.isInteger(quantity)) throw unprocessable(MAINTENANCE_MESSAGES.adjustmentInvalid)
      const estimatedAmount =
        input.estimatedAmount == null || input.estimatedAmount === ''
          ? item
            ? item.unitPrice * quantity
            : null
          : (readNumber(input, 'estimatedAmount', { min: 0 }) ?? null)
      const workOrderNo = optionalReference(db.workOrders, input, 'workOrderNo')
      const at = nowIsoDateTime()
      const no = nextNo(
        db.purchaseRequests.all().map((row) => row.no),
        `DA-${at.slice(0, 4)}-`,
        4
      )
      if (workOrderNo) {
        const order = workableOrder(workOrderNo)
        // Waiting for a part keeps the vehicle unavailable, even for a service not started yet.
        const downtimeNo = order.downtimeNo ?? openDowntime(db, order, at, request)
        db.workOrders.update(order.no, {
          downtimeNo,
          parts: [
            ...order.parts,
            {
              itemNo,
              label,
              quantity,
              unitPrice: estimatedAmount !== null ? estimatedAmount / quantity : 0,
              purchaseRequestNo: no,
              receivedAt: null
            }
          ],
          ...stampModified(request)
        })
      }
      return {
        no,
        itemNo,
        label,
        quantity,
        estimatedAmount,
        workOrderNo,
        requestedAt: at,
        requestedBy: sessionUser(request).code,
        supplierNo: optionalReference(db.providers, input, 'supplierNo'),
        orderNumber: '',
        orderedAt: null,
        orderedBy: null,
        receivedAt: null,
        receivedBy: null,
        finalAmount: null,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: '',
        // Simulated link: the request is handed to the ERP the moment it is made.
        erpReference: `ERP-${no}`,
        erpSentAt: at
      }
    },
    update: (existing, input) => {
      if (purchaseRequestStatus(existing) !== 'requested') {
        throw conflict(MAINTENANCE_MESSAGES.purchaseRequestWrongStatus)
      }
      const label =
        'label' in input ? readString(input, 'label', { required: true }) : existing.label
      const estimatedAmount =
        'estimatedAmount' in input
          ? (readNumber(input, 'estimatedAmount', { min: 0 }) ?? null)
          : existing.estimatedAmount
      return { label, estimatedAmount }
    }
  })

  router.post(
    '/maintenance/purchase-requests/:no/order',
    { feature: 'PURCHASEREQUEST', action: 'update' },
    (request) => {
      const row = inStatus(routeParam(request, 'no'), 'requested')
      const body = readBody(request)
      const orderNumber = readString(body, 'orderNumber', { required: true })
      const supplier = db.providers.findOrFail(requireReference(db.providers, body, 'supplierNo'))
      if (supplier.providerType !== 'parts_supplier' || !supplier.authorized) {
        throw unprocessable(MAINTENANCE_MESSAGES.supplierNotAuthorized, { name: supplier.name })
      }
      db.purchaseRequests.update(row.no, {
        orderNumber,
        supplierNo: supplier.no,
        orderedAt: nowIsoDateTime(),
        orderedBy: sessionUser(request).code,
        ...stampModified(request)
      })
      return respond(row.no)
    }
  )

  // A stocked part enters the store, then leaves it for the order that asked for it.
  router.post(
    '/maintenance/purchase-requests/:no/receive',
    { feature: 'PURCHASEREQUEST', action: 'update' },
    (request) => {
      const row = inStatus(routeParam(request, 'no'), 'ordered')
      const body = readBody(request)
      const finalAmount =
        body.finalAmount == null || body.finalAmount === ''
          ? row.estimatedAmount
          : (readNumber(body, 'finalAmount', { min: 0 }) ?? null)
      const unitPrice = finalAmount !== null ? finalAmount / row.quantity : 0
      const at = nowIsoDateTime()
      const order = row.workOrderNo ? db.workOrders.find(row.workOrderNo) : undefined
      const serveOrder =
        !!order &&
        isWorkable(workOrderStatus({ ...order, diagnosedAt: order.diagnosis?.at ?? null }))
      if (row.itemNo) {
        const movement = {
          itemNo: row.itemNo,
          unitPrice,
          reason: row.orderNumber,
          workOrderNo: null,
          purchaseRequestNo: row.no,
          at
        }
        addMovement(db, { ...movement, kind: 'in', delta: row.quantity }, request)
        if (serveOrder) {
          addMovement(
            db,
            { ...movement, kind: 'out', delta: -row.quantity, workOrderNo: order.no },
            request
          )
        }
      }
      db.purchaseRequests.update(row.no, {
        receivedAt: at,
        receivedBy: sessionUser(request).code,
        finalAmount,
        ...stampModified(request)
      })
      if (serveOrder) updateOrderLine(row, () => ({ receivedAt: at, unitPrice }), request)
      return respond(row.no)
    }
  )

  router.post(
    '/maintenance/purchase-requests/:no/cancel',
    { feature: 'PURCHASEREQUEST', action: 'execute' },
    (request) => {
      const row = db.purchaseRequests.findOrFail(routeParam(request, 'no'))
      const status = purchaseRequestStatus(row)
      if (status === 'received' || status === 'cancelled') {
        throw conflict(MAINTENANCE_MESSAGES.purchaseRequestWrongStatus)
      }
      const reason = readString(readBody(request), 'reason')
      if (reason.length < MIN_REASON) {
        throw unprocessable(MAINTENANCE_MESSAGES.reasonTooShort, { min: MIN_REASON })
      }
      db.purchaseRequests.update(row.no, {
        cancelledAt: nowIsoDateTime(),
        cancelledBy: sessionUser(request).code,
        cancelReason: reason,
        ...stampModified(request)
      })
      updateOrderLine(row, () => null, request)
      return respond(row.no)
    }
  )
}
