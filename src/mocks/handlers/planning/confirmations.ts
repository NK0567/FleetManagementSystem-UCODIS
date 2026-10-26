import { checkDeliveryRequest, newDeliveryRequest, nextDeliveryRequestNo } from './deliveryRequests'
import {
  confirmationState,
  linesConfirmed,
  lineOutOfTour,
  type ConfirmationState
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderLineRow, TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampCreated, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { readReason } from './planningReasons'

const FEATURE = 'CUSTOMERCONFIRMATION'

export interface ConfirmationLineApi {
  orderNo: string
  lineNo: number
  deliveryPointName: string
  recipientName: string
  productName: string
  quantity: number
  unit: string
  state: ConfirmationState
  clientProposedOn: string | null
  plannerProposedOn: string | null
  availableOn: string | null
  trackingToken: string | null
  trackingExpiresOn: string | null
}

function orderStatus(db: MockDatabase, order: TransportOrderRow) {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  return transportOrderStatus({
    cancelledAt: order.cancelledAt,
    means: order.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(order.lines)
  })
}

/** Confirmation happens after planning and before the vehicle leaves. */
function assertOpen(db: MockDatabase, order: TransportOrderRow): void {
  const status = orderStatus(db, order)
  if (status !== 'planned' && status !== 'confirmed') {
    throw conflict(PLANNING_MESSAGES.confirmationClosed)
  }
}

export function confirmationsApi(db: MockDatabase): ConfirmationLineApi[] {
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const rows: ConfirmationLineApi[] = []
  for (const order of db.transportOrders.all()) {
    const status = orderStatus(db, order)
    if (status !== 'planned' && status !== 'confirmed') continue
    for (const line of order.lines) {
      const point = points.get(line.deliveryPointNo)
      const product = products.get(line.productNo)
      rows.push({
        orderNo: order.no,
        lineNo: line.lineNo,
        deliveryPointName: point?.name ?? '',
        recipientName: customers.get(point?.customerNo ?? '') ?? '',
        productName: product?.name ?? '',
        quantity: line.quantity,
        unit: product?.unit ?? '',
        state: confirmationState(line),
        clientProposedOn: line.clientProposedOn,
        plannerProposedOn: line.plannerProposedOn,
        availableOn: line.availableOn,
        trackingToken: line.trackingToken,
        trackingExpiresOn: line.trackingExpiresOn
      })
    }
  }
  return rows
}

function lineOf(order: TransportOrderRow, lineNo: number): TransportOrderLineRow {
  const line = order.lines.find((item) => item.lineNo === lineNo)
  if (!line) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
  return line
}

function saveLine(
  db: MockDatabase,
  order: TransportOrderRow,
  line: TransportOrderLineRow,
  request: MockRequest,
  event?: { kind: 'confirmed' | 'replanned'; detail: string }
): void {
  db.transportOrders.update(order.no, {
    lines: order.lines.map((item) => (item.lineNo === line.lineNo ? line : item)),
    events: event
      ? [
          ...order.events,
          { at: nowIsoDateTime(), by: sessionUser(request).code, kind: event.kind, detail: event.detail }
        ]
      : order.events,
    ...stampModified(request)
  })
}

export function registerConfirmationsHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/confirmations', { feature: FEATURE, action: 'read' }, () =>
    ok(confirmationsApi(db))
  )

  const act = (
    name: string,
    apply: (order: TransportOrderRow, line: TransportOrderLineRow, request: MockRequest) => void
  ) =>
    router.post(
      `/planning/transport-orders/:no/lines/:lineNo/${name}`,
      { feature: FEATURE, action: 'execute' },
      (request) => {
        const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
        assertOpen(db, order)
        const line = lineOf(order, Number(routeParam(request, 'lineNo')))
        if (line.replannedAt) throw conflict(PLANNING_MESSAGES.confirmationAlreadyReplanned)
        apply(order, line, request)
        return ok(confirmationsApi(db).find((item) => item.orderNo === order.no && item.lineNo === line.lineNo))
      }
    )

  act('confirm', (order, line, request) => {
    if (lineOutOfTour(line)) throw conflict(PLANNING_MESSAGES.confirmationOutOfTour)
    const next = {
      ...line,
      confirmedAt: nowIsoDateTime(),
      confirmedBy: sessionUser(request).code,
      unavailableAt: null,
      unavailabilityReasonNo: null,
      unavailabilityComment: ''
    }
    saveLine(db, order, next, request, { kind: 'confirmed', detail: String(line.lineNo) })
  })

  act('unavailable', (order, line, request) => {
    const body = readBody(request)
    const reason = readReason(db, body, 'unavailability')
    const availableOn = readDate(body, 'availableOn')
    const next = {
      ...line,
      unavailableAt: nowIsoDateTime(),
      unavailabilityReasonNo: reason.reasonNo,
      unavailabilityComment: reason.comment,
      availableOn,
      confirmedAt: null,
      confirmedBy: null
    }
    saveLine(db, order, next, request)
  })

  act('client-date', (order, line, request) => {
    const date = readDate(readBody(request), 'date', { required: true })
    saveLine(db, order, { ...line, clientProposedOn: date }, request)
  })

  act('propose-date', (order, line, request) => {
    const date = readDate(readBody(request), 'date', { required: true })
    saveLine(db, order, { ...line, plannerProposedOn: date }, request)
  })

  act('accept-date', (order, line, request) => {
    const body = readBody(request)
    const date =
      readDate(body, 'date') ?? line.clientProposedOn ?? line.plannerProposedOn ?? line.availableOn
    if (!date) throw unprocessable(PLANNING_MESSAGES.confirmationDateMissing)
    const source = line.deliveryRequestNo
      ? db.deliveryRequests.find(line.deliveryRequestNo)
      : undefined
    const point = db.deliveryPoints.findOrFail(line.deliveryPointNo)
    const ordererNo = source?.ordererNo ?? (db.customers.findOrFail(point.customerNo).isOrderer ? point.customerNo : '')
    if (!ordererNo) throw unprocessable(PLANNING_MESSAGES.confirmationNeedsOrderer)
    const entry = {
      ordererNo,
      deliveryPointNo: line.deliveryPointNo,
      desiredDate: date,
      validUntil: null,
      externalReference: '',
      freightPayer: source?.freightPayer ?? ('orderer' as const),
      comment: '',
      productNo: line.productNo,
      quantity: line.quantity,
      weightKg: line.weightKg,
      volumeM3: source?.volumeM3 ?? null
    }
    checkDeliveryRequest(db, entry)
    const no = nextDeliveryRequestNo(db)
    db.deliveryRequests.insert(
      stampCreated({ ...newDeliveryRequest(no, entry, 'planner'), parentNo: source?.no ?? null }, request)
    )
    saveLine(db, order, { ...line, replannedAt: nowIsoDateTime() }, request, {
      kind: 'replanned',
      detail: no
    })
  })
}
