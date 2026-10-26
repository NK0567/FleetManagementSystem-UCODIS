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
import { sessionUser } from '../../http/types'
import { orderPlace, visibleTo } from './perimeter'
import { planningSettings } from './settings'

function visibleOrders(db: MockDatabase, userCode: string): TransportOrderRow[] {
  return db.transportOrders.all().filter((order) => visibleTo(db, userCode, orderPlace(db, order)))
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
  return {
    orders: orders.length,
    punctuality: punctualityRate(onTime, arrived),
    confirmation: confirmationRate(attested, declared),
    contestation: contestationRate(contested, declared)
  }
}

export function carrierReport(db: MockDatabase, userCode: string) {
  const figures = new Map<string, CarrierFigures>()
  for (const order of visibleOrders(db, userCode)) {
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
    if (invoice.refusedAt) continue
    const row = figures.get(invoice.carrierNo)
    if (!row) continue
    row.invoices += 1
    if (invoice.validatedAt && invoice.agreedAmount === null) row.withoutTariff += 1
  }
  return [...figures.values()].map(carrierIndicators)
}

export function registerReportHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/dashboard', { feature: 'PLANNINGDASHBOARD', action: 'read' }, (request) =>
    ok(planningDashboard(db, sessionUser(request).code))
  )
  router.get('/planning/reports/carriers', { feature: 'TRANSPORTREPORT', action: 'read' }, (request) =>
    ok(carrierReport(db, sessionUser(request).code))
  )
}
