import { lineOutOfTour } from '@/modules/planning/customer-confirmations/domain/confirmation'
import {
  billIssue,
  billedCustomer,
  flatShare,
  netAmount,
  type BillIssue
} from '@/modules/planning/customer-billing/domain/billing'
import { applicableTariff } from '@/modules/planning/transport-tariffs/domain/transportTariff'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderLineRow, TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { planningSettings } from './settings'

const FEATURE = 'CUSTOMERBILLING'

const ISSUE_MESSAGES = {
  not_delivered: PLANNING_MESSAGES.billingNotDelivered,
  internal: PLANNING_MESSAGES.billingInternal,
  reception: PLANNING_MESSAGES.billingReception,
  gap: PLANNING_MESSAGES.billingGap,
  contestation: PLANNING_MESSAGES.billingContestation,
  tariff: PLANNING_MESSAGES.billingTariff
} as const

function customerOf(db: MockDatabase, line: TransportOrderLineRow) {
  const request = line.deliveryRequestNo ? db.deliveryRequests.find(line.deliveryRequestNo) : undefined
  const point = db.deliveryPoints.findOrFail(line.deliveryPointNo)
  const recipient = db.customers.findOrFail(point.customerNo)
  const orderer = request?.ordererNo ? db.customers.find(request.ordererNo) : undefined
  return billedCustomer({
    freightPayer: request?.freightPayer ?? planningSettings(db).billing.defaultFreightPayer,
    ordererNo: request?.ordererNo ?? null,
    ordererInternal: orderer?.nature === 'internal',
    recipientNo: recipient.no,
    recipientInternal: recipient.nature === 'internal'
  })
}

function quote(db: MockDatabase, order: TransportOrderRow, line: TransportOrderLineRow) {
  const customerNo = customerOf(db, line)
  if (customerNo === 'internal') return { issue: 'internal' as BillIssue }
  const routeNo = order.tripNo ? (db.trips.find(order.tripNo)?.routeTemplateNo ?? order.routeTemplateNo) : order.routeTemplateNo
  const route = routeNo ? db.routeTemplates.find(routeNo) : undefined
  const product = db.products.find(line.productNo)
  const tariff = applicableTariff(db.transportTariffs.all(), {
    target: 'customer',
    partyNo: customerNo,
    routeTemplateNo: routeNo,
    distanceKm: route?.estimatedDistanceKm ?? null,
    quantity: line.receivedQuantity ?? line.quantity,
    weightKg: line.weightKg,
    productNo: line.productNo,
    family: product?.family ?? null
  })
  const issue = billIssue(line, todayIso(), planningSettings(db).confirmation.tacitConfirmationDays, tariff)
  if (issue || !tariff) return { issue: issue ?? ('tariff' as BillIssue) }
  const credit = line.responsibility?.impacts.find((impact) => impact.type === 'customer_credit')?.amount ?? 0
  let gross = tariff.amount
  let flat: number | null = null
  if (tariff.rule.basis === 'route_template') {
    const parts = order.lines
      .filter((other) => customerOf(db, other) === customerNo && other.declaredAt && !lineOutOfTour(other))
      .map((other) => ({ key: String(other.lineNo), invoicedShare: other.invoiceFlatShare }))
    flat = flatShare(tariff.amount, parts, String(line.lineNo))
    gross = flat
  }
  return {
    issue: null,
    customerNo,
    amount: netAmount(gross, credit),
    credit,
    flatShare: flat,
    tariffNo: tariff.rule.no
  }
}

function referenceTaken(db: MockDatabase, reference: string): boolean {
  const key = reference.toLowerCase()
  return db.transportOrders.all().some((order) =>
    order.lines.some(
      (line) =>
        (line.invoiceReference && line.invoiceReference.toLowerCase() === key) ||
        (line.creditReference && line.creditReference.toLowerCase() === key)
    )
  )
}

function lineLabels(db: MockDatabase, line: TransportOrderLineRow, customerNo: string | null) {
  const product = db.products.find(line.productNo)
  return {
    customerName: customerNo ? (db.customers.find(customerNo)?.name ?? null) : null,
    deliveryPointNo: line.deliveryPointNo,
    deliveryPointName: db.deliveryPoints.find(line.deliveryPointNo)?.name ?? null,
    productNo: line.productNo,
    productName: product?.name ?? null,
    unit: product?.unit ?? null,
    quantity: line.receivedQuantity ?? line.quantity,
    declaredAt: line.declaredAt
  }
}

export function customerBillingApi(db: MockDatabase) {
  const rows = []
  for (const order of db.transportOrders.all()) {
    if (order.cancelledAt && order.lines.every((line) => !line.declaredAt)) continue
    for (const line of order.lines) {
      if (!line.declaredAt && !line.invoiceReference) continue
      if (line.invoiceReference) {
        rows.push({
          orderNo: order.no,
          lineNo: line.lineNo,
          customerNo: line.invoiceCustomerNo,
          ...lineLabels(db, line, line.invoiceCustomerNo),
          amount: line.invoiceAmount,
          tariffNo: line.invoiceTariffNo,
          reference: line.invoiceReference,
          issue: null
        })
        continue
      }
      const priced = quote(db, order, line)
      rows.push({
        orderNo: order.no,
        lineNo: line.lineNo,
        customerNo: priced.customerNo ?? null,
        ...lineLabels(db, line, priced.customerNo ?? null),
        amount: priced.amount ?? null,
        tariffNo: priced.tariffNo ?? null,
        reference: null,
        issue: priced.issue
      })
    }
  }
  return rows
}

export function registerCustomerBillingHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/customer-billing', { feature: FEATURE, action: 'read' }, () => ok(customerBillingApi(db)))

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/invoice',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      const lineNo = Number(routeParam(request, 'lineNo'))
      const line = order.lines.find((item) => item.lineNo === lineNo)
      if (!line) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
      if (line.invoiceReference) throw conflict(PLANNING_MESSAGES.billingInvoiced)
      const reference = readString(readBody(request), 'reference', { required: true })
      if (referenceTaken(db, reference)) throw conflict(PLANNING_MESSAGES.billingReference)
      const priced = quote(db, order, line)
      if (priced.issue || priced.amount == null || !priced.customerNo || !priced.tariffNo) {
        throw unprocessable(ISSUE_MESSAGES[priced.issue ?? 'tariff'])
      }
      const next = {
        ...line,
        invoiceCustomerNo: priced.customerNo,
        invoiceReference: reference,
        invoiceAmount: priced.amount,
        invoiceFlatShare: priced.flatShare ?? null,
        invoiceTariffNo: priced.tariffNo,
        customerInvoicedAt: nowIsoDateTime()
      }
      db.transportOrders.update(order.no, {
        lines: order.lines.map((item) => (item.lineNo === lineNo ? next : item)),
        events: [
          ...order.events,
          { at: nowIsoDateTime(), by: sessionUser(request).code, kind: 'invoiced' as const, detail: reference }
        ],
        ...stampModified(request)
      })
      return ok({ reference, amount: priced.amount, customerNo: priced.customerNo })
    }
  )
}
