import {
  averageLeadTime,
  leadTimeDays
} from '@/modules/maintenance/purchase-requests/domain/purchaseRequest'
import { stockStatus } from '@/modules/maintenance/stock-items/domain/stock'
import type {
  StockItemApi,
  StockMovementApi,
  StockSummaryApi,
  SupplierSupplyApi
} from '@/modules/maintenance/stock-items/types/stockItem.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { StockItemRow } from '../../fixtures/maintenance/stockItems'
import {
  readBody,
  registerCrudResource,
  registerListResource,
  routeParam
} from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import {
  readAll,
  readBoolean,
  readCode,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { MAINTENANCE_MESSAGES } from './messages'
import { addMovement, stockQuantities } from './stockLedger'

type Fields = Omit<StockItemRow, 'no' | keyof AuditFields>

/** Shortest reason accepted for an adjustment. */
const MIN_REASON = 10

export function stockItemsApi(db: MockDatabase): StockItemApi[] {
  const quantities = stockQuantities(db)
  const subsystems = new Map(db.failureCodes.all().map((code) => [code.no, code.name]))
  const suppliers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const leadTimes = new Map<string, (number | null)[]>()
  for (const row of db.purchaseRequests.all()) {
    if (!row.supplierNo) continue
    leadTimes.set(row.supplierNo, [
      ...(leadTimes.get(row.supplierNo) ?? []),
      leadTimeDays(row.orderedAt, row.receivedAt)
    ])
  }
  return db.stockItems.all().map((row) => {
    const stock = quantities.get(row.no) ?? 0
    return {
      ...row,
      subsystemName: subsystems.get(row.subsystemNo) ?? row.subsystemNo,
      supplierName: row.supplierNo ? (suppliers.get(row.supplierNo) ?? row.supplierNo) : '',
      supplierLeadTimeDays: row.supplierNo
        ? averageLeadTime(leadTimes.get(row.supplierNo) ?? [])
        : null,
      stockQuantity: stock,
      stockValue: stock * row.unitPrice,
      status: stockStatus(stock, row.alertThreshold)
    }
  })
}

export function stockMovementsApi(db: MockDatabase): StockMovementApi[] {
  const items = new Map(db.stockItems.all().map((item) => [item.no, item.name]))
  const orders = new Map(db.workOrders.all().map((order) => [order.no, order.vehicleNo]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  return db.stockMovements.all().map((row) => {
    const vehicleNo = row.workOrderNo ? orders.get(row.workOrderNo) : undefined
    return {
      ...row,
      itemName: items.get(row.itemNo) ?? row.itemNo,
      quantity: Math.abs(row.delta),
      value: Math.abs(row.delta) * row.unitPrice,
      vehiclePlate: vehicleNo ? (plates.get(vehicleNo) ?? vehicleNo) : ''
    }
  })
}

export function registerStockItemsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    subsystemNo: (input) => {
      const no = requireReference(db.failureCodes, input, 'subsystemNo')
      if (db.failureCodes.findOrFail(no).kind !== 'subsystem') {
        throw unprocessable(MAINTENANCE_MESSAGES.diagnosisCodeKind, { field: 'subsystemNo' })
      }
      return no
    },
    supplierNo: (input) => optionalReference(db.providers, input, 'supplierNo'),
    unitPrice: (input) => readNumber(input, 'unitPrice', { required: true, min: 0 }) ?? 0,
    alertThreshold: (input) => readNumber(input, 'alertThreshold', { required: true, min: 0 }) ?? 0,
    active: (input) => readBoolean(input, 'active', true)
  }

  registerListResource(router, {
    basePath: '/maintenance/stock-movements',
    feature: 'STOCKITEM',
    rows: () => stockMovementsApi(db),
    searchColumns: ['itemNo', 'itemName', 'workOrderNo', 'reason'],
    optionFields: { kind: 'stockMovementKind' }
  })

  router.get('/maintenance/stock-items/summary', { feature: 'STOCKITEM', action: 'read' }, () => {
    const items = stockItemsApi(db)
    const summary: StockSummaryApi = {
      itemCount: items.length,
      toReorderCount: items.filter((item) => item.status === 'low' || item.status === 'out').length,
      totalValue: items.reduce((total, item) => total + item.stockValue, 0)
    }
    return ok(summary)
  })

  /** What a supplier provides the workshop with, and how fast it delivers. */
  router.get(
    '/maintenance/suppliers/:no/supply',
    { feature: 'STOCKITEM', action: 'read' },
    (request) => {
      const supplier = db.providers.findOrFail(routeParam(request, 'no'))
      const received = db.purchaseRequests
        .all()
        .filter((row) => row.supplierNo === supplier.no && row.receivedAt && !row.cancelledAt)
      const supply: SupplierSupplyApi = {
        supplierNo: supplier.no,
        averageLeadTimeDays: averageLeadTime(
          received.map((row) => leadTimeDays(row.orderedAt, row.receivedAt))
        ),
        receivedCount: received.length,
        items: stockItemsApi(db)
          .filter((item) => item.supplierNo === supplier.no)
          .map(({ no, name, unitPrice, stockQuantity, status }) => ({
            no,
            name,
            unitPrice,
            stockQuantity,
            status
          }))
      }
      return ok(supply)
    }
  )

  router.get(
    '/maintenance/stock-items/:no/movements',
    { feature: 'STOCKITEM', action: 'read' },
    (request) => {
      const item = db.stockItems.findOrFail(routeParam(request, 'no'))
      return ok(
        stockMovementsApi(db)
          .filter((movement) => movement.itemNo === item.no)
          .sort((a, b) => b.at.localeCompare(a.at))
      )
    }
  )

  // A count that differs from the ledger is corrected by a signed, explained movement.
  router.post(
    '/maintenance/stock-items/:no/adjust',
    { feature: 'STOCKITEM', action: 'execute' },
    (request) => {
      const item = db.stockItems.findOrFail(routeParam(request, 'no'))
      const body = readBody(request)
      const delta = readNumber(body, 'delta', { required: true }) ?? 0
      if (!Number.isInteger(delta) || delta === 0) {
        throw unprocessable(MAINTENANCE_MESSAGES.adjustmentInvalid)
      }
      const reason = readString(body, 'reason')
      if (reason.length < MIN_REASON) {
        throw unprocessable(MAINTENANCE_MESSAGES.reasonTooShort, { min: MIN_REASON })
      }
      addMovement(
        db,
        {
          itemNo: item.no,
          kind: 'adjustment',
          delta,
          unitPrice: item.unitPrice,
          reason,
          workOrderNo: null,
          purchaseRequestNo: null
        },
        request
      )
      return ok(stockItemsApi(db).find((row) => row.no === item.no))
    }
  )

  registerCrudResource(router, {
    basePath: '/maintenance/stock-items',
    feature: 'STOCKITEM',
    collection: db.stockItems,
    list: () => stockItemsApi(db),
    searchColumns: ['no', 'name', 'supplierName'],
    optionFields: { status: 'stockStatus' },
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers)
  })
}
