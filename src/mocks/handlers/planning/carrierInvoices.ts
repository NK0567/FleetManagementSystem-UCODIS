import {
  lineOutOfTour,
  linesConfirmed
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import { linesDelivered } from '@/modules/planning/execution/domain/execution'
import { loadingReady } from '@/modules/planning/loading/domain/loading'
import {
  agreedTotal,
  carrierInvoiceStatus,
  validateIssue
} from '@/modules/planning/carrier-invoices/domain/carrierInvoice'
import { applicableTariff } from '@/modules/planning/transport-tariffs/domain/transportTariff'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { CarrierInvoiceRow } from '../../fixtures/planning/carrierInvoices'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampCreated, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate, readNumber, readString, readStringList } from '../../http/input'
import { requireReference } from '../../http/references'
import { created, ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { planningSettings } from './settings'

const FEATURE = 'CARRIERINVOICE'

function paidLines(order: TransportOrderRow): TransportOrderLineRow[] {
  if (order.cancelledAt) return order.lines.filter((line) => line.declaredAt)
  return order.lines.filter((line) => !lineOutOfTour(line))
}

function orderDone(db: MockDatabase, order: TransportOrderRow): boolean {
  if (order.cancelledAt) return order.lines.some((line) => line.declaredAt)
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const fleetDeparted = !!trip && ['in_progress', 'completed', 'closed'].includes(trip.status)
  const status = transportOrderStatus({
    cancelledAt: order.cancelledAt,
    closedAt: order.closedAt,
    means: order.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(order.lines),
    loadingReady: loadingReady(order.lines),
    carrierDeparted: order.carrierDepartedAt !== null || fleetDeparted,
    linesDelivered: linesDelivered(order.lines)
  })
  return status === 'completed' || (status === 'in_progress' && linesDelivered(order.lines))
}

function agreedOf(db: MockDatabase, order: TransportOrderRow) {
  const lines = paidLines(order)
  const routeNo = order.tripNo
    ? (db.trips.find(order.tripNo)?.routeTemplateNo ?? order.routeTemplateNo)
    : order.routeTemplateNo
  const route = routeNo ? db.routeTemplates.find(routeNo) : undefined
  const productNos = [...new Set(lines.map((line) => line.productNo))]
  const tariff = applicableTariff(db.transportTariffs.all(), {
    target: 'carrier',
    partyNo: order.carrierNo ?? '',
    routeTemplateNo: routeNo,
    distanceKm: route?.estimatedDistanceKm ?? null,
    quantity:
      lines.reduce((sum, line) => sum + (line.receivedQuantity ?? line.quantity), 0) || null,
    weightKg: lines.reduce((sum, line) => sum + (line.weightKg ?? 0), 0) || null,
    productNo: productNos.length === 1 ? (productNos[0] ?? null) : null,
    family: null
  })
  const withholding = lines.reduce(
    (sum, line) =>
      sum +
      (line.responsibility?.impacts.find((impact) => impact.type === 'carrier_withholding')
        ?.amount ?? 0),
    0
  )
  return { net: tariff ? Math.max(0, tariff.amount - withholding) : null, withholding }
}

function holdingInvoice(
  db: MockDatabase,
  orderNo: string,
  except?: string
): CarrierInvoiceRow | undefined {
  return db.carrierInvoices
    .all()
    .find(
      (invoice) => invoice.no !== except && !invoice.refusedAt && invoice.orderNos.includes(orderNo)
    )
}

function view(db: MockDatabase, invoice: CarrierInvoiceRow) {
  const orders = invoice.orderNos
    .map((no) => db.transportOrders.find(no))
    .filter((order) => !!order)
  const live = agreedTotal(orders.map((order) => agreedOf(db, order)))
  return {
    ...invoice,
    carrierName: db.providers.find(invoice.carrierNo)?.name ?? null,
    status: carrierInvoiceStatus(invoice),
    agreedAmount: invoice.validatedAt ? invoice.agreedAmount : live.total,
    withholdingAmount: invoice.validatedAt ? invoice.withholdingAmount : live.withholding,
    untariffed: invoice.validatedAt ? invoice.agreedAmount === null : live.untariffed
  }
}

export function registerCarrierInvoiceHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/carrier-invoices', { feature: FEATURE, action: 'read' }, () =>
    ok(db.carrierInvoices.all().map((invoice) => view(db, invoice)))
  )

  router.post('/planning/carrier-invoices', { feature: FEATURE, action: 'execute' }, (request) => {
    const body = readBody(request)
    const carrierNo = requireReference(db.providers, body, 'carrierNo')
    const carrier = db.providers.findOrFail(carrierNo)
    if (carrier.providerType !== 'carrier')
      throw unprocessable(PLANNING_MESSAGES.carrierInvoiceNotCarrier)
    const reference = readString(body, 'reference', { required: true })
    const invoiceDate = readDate(body, 'date', { required: true }) ?? ''
    if (invoiceDate > todayIso()) throw unprocessable(PLANNING_MESSAGES.carrierInvoiceDate)
    const amount = readNumber(body, 'amount', { required: true, min: 0.01 }) ?? 0
    const orderNos = readStringList(body, 'orderNos')
    if (!orderNos.length) throw unprocessable(PLANNING_MESSAGES.carrierInvoiceOrders)
    if (new Set(orderNos).size !== orderNos.length)
      throw unprocessable(PLANNING_MESSAGES.carrierInvoiceOrders)
    const taken = db.carrierInvoices
      .all()
      .some(
        (invoice) =>
          !invoice.refusedAt &&
          invoice.carrierNo === carrierNo &&
          invoice.reference.toLowerCase() === reference.toLowerCase()
      )
    if (taken) throw conflict(PLANNING_MESSAGES.carrierInvoiceReference)
    for (const no of orderNos) {
      const order = db.transportOrders.find(no)
      if (!order || order.means !== 'carrier' || order.carrierNo !== carrierNo) {
        throw unprocessable(PLANNING_MESSAGES.carrierInvoiceOrder)
      }
      const other = holdingInvoice(db, no)
      if (other) throw conflict(PLANNING_MESSAGES.carrierInvoiceCovered, { no: other.no })
    }
    const no = nextNo(
      db.carrierInvoices.all().map((invoice) => invoice.no),
      `CI-${todayIso().slice(0, 4)}-`,
      4
    )
    const row = stampCreated<CarrierInvoiceRow>(
      {
        no,
        carrierNo,
        reference,
        invoiceDate,
        amount,
        orderNos,
        agreedAmount: null,
        withholdingAmount: null,
        untariffedReason: '',
        validatedAt: null,
        validatedBy: null,
        refusedAt: null,
        refusedBy: null,
        refusalReason: ''
      },
      request
    )
    db.carrierInvoices.insert(row)
    return created(view(db, row))
  })

  router.patch(
    '/planning/carrier-invoices/:no',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const invoice = db.carrierInvoices.findOrFail(routeParam(request, 'no'))
      if (carrierInvoiceStatus(invoice) !== 'to_check')
        throw conflict(PLANNING_MESSAGES.carrierInvoiceClosed)
      const amount =
        readNumber(readBody(request), 'amount', { required: true, min: 0.01 }) ?? invoice.amount
      const updated = db.carrierInvoices.update(invoice.no, { amount, ...stampModified(request) })
      return ok(view(db, updated))
    }
  )

  router.post(
    '/planning/carrier-invoices/:no/validate',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const invoice = db.carrierInvoices.findOrFail(routeParam(request, 'no'))
      if (carrierInvoiceStatus(invoice) !== 'to_check')
        throw conflict(PLANNING_MESSAGES.carrierInvoiceClosed)
      const orders = invoice.orderNos.map((no) => db.transportOrders.findOrFail(no))
      const summary = agreedTotal(orders.map((order) => agreedOf(db, order)))
      const reason = readString(readBody(request), 'reason')
      const issue = validateIssue({
        done: orders.every((order) => orderDone(db, order)),
        untariffed: summary.untariffed,
        amount: invoice.amount,
        agreed: summary.total,
        tolerance: planningSettings(db).billing.carrierInvoiceToleranceAmount,
        reason
      })
      if (issue === 'not_done') throw unprocessable(PLANNING_MESSAGES.carrierInvoiceNotDone)
      if (issue === 'outside') throw unprocessable(PLANNING_MESSAGES.carrierInvoiceOutside)
      if (issue === 'reason') throw unprocessable(PLANNING_MESSAGES.carrierInvoiceReason)
      const validatedAt = nowIsoDateTime()
      for (const order of orders) {
        db.transportOrders.update(order.no, {
          lines: order.lines.map((line) => ({ ...line, carrierInvoiceValidatedAt: validatedAt }))
        })
      }
      const updated = db.carrierInvoices.update(invoice.no, {
        agreedAmount: summary.total,
        withholdingAmount: summary.withholding,
        untariffedReason: summary.untariffed ? reason : '',
        validatedAt,
        validatedBy: sessionUser(request).code,
        ...stampModified(request)
      })
      return ok(view(db, updated))
    }
  )

  router.post(
    '/planning/carrier-invoices/:no/refuse',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const invoice = db.carrierInvoices.findOrFail(routeParam(request, 'no'))
      if (carrierInvoiceStatus(invoice) !== 'to_check')
        throw conflict(PLANNING_MESSAGES.carrierInvoiceClosed)
      const refusalReason = readString(readBody(request), 'reason', { required: true })
      const updated = db.carrierInvoices.update(invoice.no, {
        refusedAt: nowIsoDateTime(),
        refusedBy: sessionUser(request).code,
        refusalReason,
        ...stampModified(request)
      })
      return ok(view(db, updated))
    }
  )
}
