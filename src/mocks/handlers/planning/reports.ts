import { receptionAttested } from '@/modules/planning/reception/domain/reception'
import {
  carrierIndicators,
  confirmationRate,
  contestationRate,
  punctualityRate,
  type CarrierFigures
} from '@/modules/planning/reports/domain/indicators'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { customerBillingApi } from './customerBilling'
import { orderPlace, visibleTo } from './perimeter'
import { planningSettings } from './settings'

export interface ReportPeriod {
  from: string
  to: string
}

const DASHBOARD_CARRIERS = 5

function periodOf(request: MockRequest): ReportPeriod {
  const read = (key: string) =>
    typeof request.query[key] === 'string' ? String(request.query[key]) : ''
  return { from: read('from'), to: read('to') }
}

/** An order belongs to the period of its planned departure; an empty bound does not filter. */
function inPeriod(order: TransportOrderRow, period: ReportPeriod): boolean {
  const day = (order.plannedDeparture ?? '').slice(0, 10)
  if (!period.from && !period.to) return true
  if (!day) return false
  return (!period.from || day >= period.from) && (!period.to || day <= period.to)
}

function visibleOrders(
  db: MockDatabase,
  userCode: string,
  period: ReportPeriod = { from: '', to: '' }
): TransportOrderRow[] {
  return db.transportOrders
    .all()
    .filter((order) => inPeriod(order, period) && visibleTo(db, userCode, orderPlace(db, order)))
}

export function planningDashboard(db: MockDatabase, userCode: string) {
  const orders = visibleOrders(db, userCode)
  const tacitDays = planningSettings(db).confirmation.tacitConfirmationDays
  const today = todayIso()
  let declared = 0
  let attested = 0
  let contested = 0
  let onTime = 0
  let arrived = 0
  for (const order of orders) {
    const planned = (order.plannedDeparture ?? '').slice(0, 10)
    for (const line of order.lines) {
      if (!line.declaredAt) continue
      declared += 1
      arrived += 1
      if (planned && line.declaredAt.slice(0, 10) <= planned) onTime += 1
      if (receptionAttested(line, today, tacitDays)) attested += 1
      if (line.receptionContestedAt) contested += 1
    }
  }
  const orderNos = new Set(orders.map((order) => order.no))
  const toInvoice = customerBillingApi(db).filter(
    (row) => orderNos.has(row.orderNo) && !row.reference && !row.issue
  )
  const invoicesToCheck = db.carrierInvoices
    .all()
    .filter(
      (invoice) =>
        !invoice.validatedAt &&
        !invoice.refusedAt &&
        invoice.orderNos.some((no) => orderNos.has(no))
    ).length
  const carriers = carrierReport(db, userCode)
    .sort((left, right) => right.orders - left.orders)
    .slice(0, DASHBOARD_CARRIERS)
  return {
    orders: orders.length,
    punctuality: punctualityRate(onTime, arrived),
    confirmation: confirmationRate(attested, declared),
    contestation: contestationRate(contested, declared),
    lines: { declared, attested, contested, onTime, arrived },
    toInvoice: toInvoice.length,
    toInvoiceAmount: toInvoice.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    invoicesToCheck,
    carriers
  }
}

export function carrierReport(db: MockDatabase, userCode: string, period?: ReportPeriod) {
  const figures = new Map<string, CarrierFigures>()
  const orders = visibleOrders(db, userCode, period)
  const orderNos = new Set(orders.map((order) => order.no))
  for (const order of orders) {
    if (order.means !== 'carrier' || !order.carrierNo) continue
    const row = figures.get(order.carrierNo) ?? {
      carrierNo: order.carrierNo,
      orders: 0,
      onTime: 0,
      arrived: 0,
      attested: 0,
      contested: 0,
      refused: 0,
      declared: 0,
      invoices: 0,
      invoicesOutside: 0,
      withoutTariff: 0
    }
    row.orders += 1
    for (const line of order.lines) {
      if (line.declaredAt) row.declared += 1
      if (line.declaredAt) row.arrived += 1
      if (line.refusalAt) row.refused += 1
      if (line.receptionContestedAt) row.contested += 1
    }
    figures.set(order.carrierNo, row)
  }
  for (const invoice of db.carrierInvoices.all()) {
    if (invoice.refusedAt || !invoice.orderNos.some((no) => orderNos.has(no))) continue
    const row = figures.get(invoice.carrierNo)
    if (!row) continue
    row.invoices += 1
    if (invoice.validatedAt && invoice.agreedAmount === null) row.withoutTariff += 1
  }
  return [...figures.values()].map((row) => ({
    ...carrierIndicators(row),
    carrierName: db.providers.find(row.carrierNo)?.name ?? null
  }))
}

export function registerReportHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/dashboard', { feature: 'PLANNINGDASHBOARD', action: 'read' }, (request) =>
    ok(planningDashboard(db, sessionUser(request).code))
  )
  router.get(
    '/planning/reports/carriers',
    { feature: 'TRANSPORTREPORT', action: 'read' },
    (request) => ok(carrierReport(db, sessionUser(request).code, periodOf(request)))
  )
}
