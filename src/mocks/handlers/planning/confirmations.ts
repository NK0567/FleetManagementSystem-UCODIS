import {
  confirmationState,
  firstArrivalMarked,
  linesConfirmed,
  lineOutOfTour,
  type ConfirmationState
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import type {
  DeliverySlot,
  NotificationChannel
} from '@/modules/planning/customers/types/customer.types'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import { addDays, nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { readReason } from './planningReasons'
import { planningSettings } from './settings'
import { transportOrdersApi } from './transportOrders'

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
  /** Planned departure of the order: the queue is worked from the earliest. */
  plannedDeparture: string | null
  notificationChannel: NotificationChannel
  preferredSlot: DeliverySlot
  agent: string | null
  takenAt: string | null
  /** The recipient answered himself through the link of his SMS, WhatsApp or e-mail. */
  byLink: boolean
  /**
   * What the planned line asks of the agents (TRS01-US15): a call for a recipient whose channel is
   * the phone, once due by the company's call moment; nothing but waiting for an automated
   * channel, whose answer comes by itself.
   */
  activity: 'call' | 'call_later' | 'await_answer' | null
}

/** One answer already given, kept for the « already answered » history (TRS01-US15). */
export interface AnsweredLineApi {
  orderNo: string
  lineNo: number
  recipientName: string
  deliveryPointName: string
  productName: string
  quantity: number
  unit: string
  plannedDeparture: string | null
  answer: 'confirmed' | 'unavailable'
  /** The recipient himself through his link, or an agent after a call. */
  origin: 'recipient' | 'call'
  answeredAt: string | null
  availableOn: string | null
  orderStatus: string
}

/** The day the calls of a delivery fall due: the day before, or the day itself. */
function callDue(db: MockDatabase, plannedDeparture: string | null): boolean {
  if (!plannedDeparture) return false
  const moment = planningSettings(db).confirmation.callMoment
  const due =
    moment === 'same_day'
      ? plannedDeparture.slice(0, 10)
      : addDays(plannedDeparture.slice(0, 10), -1)
  return todayIso() >= due
}

function activityOf(
  db: MockDatabase,
  state: ConfirmationState,
  channel: NotificationChannel,
  plannedDeparture: string | null
): ConfirmationLineApi['activity'] {
  if (state !== 'pending') return null
  if (channel === 'call') return callDue(db, plannedDeparture) ? 'call' : 'call_later'
  return channel === 'none' ? null : 'await_answer'
}

function orderStatus(db: MockDatabase, order: TransportOrderRow) {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  return transportOrderStatus({
    cancelledAt: order.cancelledAt,
    means: order.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(order.lines),
    firstArrival: firstArrivalMarked(order.lines)
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
  const recipients = new Map(db.customers.all().map((customer) => [customer.no, customer]))
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const requests = new Map(db.deliveryRequests.all().map((request) => [request.no, request]))
  const rows: ConfirmationLineApi[] = []
  for (const order of db.transportOrders.all()) {
    const status = orderStatus(db, order)
    if (status !== 'planned' && status !== 'confirmed') continue
    for (const line of order.lines) {
      const point = points.get(line.deliveryPointNo)
      const product = products.get(line.productNo)
      // The order's preferences come first, then those of the recipient's record.
      const source =
        requests.get(line.deliveryRequestNo ?? '') ?? recipients.get(point?.customerNo ?? '')
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
        trackingExpiresOn: line.trackingExpiresOn,
        plannedDeparture: order.plannedDeparture,
        notificationChannel: source?.notificationChannel ?? 'sms',
        preferredSlot: source?.preferredSlot ?? 'any',
        agent: line.confirmationAgent ?? null,
        takenAt: line.confirmationTakenAt ?? null,
        byLink: line.answerOrigin === 'link',
        activity: activityOf(
          db,
          confirmationState(line),
          source?.notificationChannel ?? 'sms',
          order.plannedDeparture
        )
      })
    }
  }
  // Earliest departure first; an order with no departure yet comes last.
  return rows.sort(
    (a, b) =>
      (a.plannedDeparture ?? '9999').localeCompare(b.plannedDeparture ?? '9999') ||
      a.orderNo.localeCompare(b.orderNo) ||
      a.lineNo - b.lineNo
  )
}

/**
 * Every answer given so far, whatever has become of the order since (TRS01-US15): what was
 * answered, by whom, and where the order stands now. Lines confirmed without asking are left out.
 */
export function answeredApi(db: MockDatabase): AnsweredLineApi[] {
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const statuses = new Map(transportOrdersApi(db).map((order) => [order.no, order.status]))
  const rows: AnsweredLineApi[] = []
  for (const order of db.transportOrders.all()) {
    for (const line of order.lines) {
      const answered = line.confirmedAt ? line.confirmedBy !== 'auto' : line.unavailableAt !== null
      if (!answered || !line.answerOrigin) continue
      const point = points.get(line.deliveryPointNo)
      const product = products.get(line.productNo)
      rows.push({
        orderNo: order.no,
        lineNo: line.lineNo,
        recipientName: customers.get(point?.customerNo ?? '') ?? '',
        deliveryPointName: point?.name ?? '',
        productName: product?.name ?? '',
        quantity: line.quantity,
        unit: product?.unit ?? '',
        plannedDeparture: order.plannedDeparture,
        answer: line.confirmedAt ? 'confirmed' : 'unavailable',
        origin: line.answerOrigin === 'link' ? 'recipient' : 'call',
        answeredAt: line.confirmedAt ?? line.unavailableAt,
        availableOn: line.availableOn,
        orderStatus: statuses.get(order.no) ?? 'draft'
      })
    }
  }
  return rows.sort((a, b) => (b.answeredAt ?? '').localeCompare(a.answeredAt ?? ''))
}

/** A line taken by another agent is left to that agent. */
function assertFree(line: TransportOrderLineRow, request: MockRequest): void {
  const agent = line.confirmationAgent ?? null
  if (agent && agent !== sessionUser(request).code) {
    throw conflict(PLANNING_MESSAGES.confirmationTaken, { agent })
  }
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
          {
            at: nowIsoDateTime(),
            by: sessionUser(request).code,
            kind: event.kind,
            detail: event.detail
          }
        ]
      : order.events,
    ...stampModified(request)
  })
}

export function registerConfirmationsHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/confirmations', { feature: FEATURE, action: 'read' }, () =>
    ok(confirmationsApi(db))
  )
  router.get('/planning/confirmations/answered', { feature: FEATURE, action: 'read' }, () =>
    ok(answeredApi(db))
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
        assertFree(line, request)
        apply(order, line, request)
        return ok(
          confirmationsApi(db).find(
            (item) => item.orderNo === order.no && item.lineNo === line.lineNo
          )
        )
      }
    )

  const take = (order: TransportOrderRow, line: TransportOrderLineRow, request: MockRequest) =>
    saveLine(
      db,
      order,
      {
        ...line,
        confirmationAgent: sessionUser(request).code,
        confirmationTakenAt: nowIsoDateTime()
      },
      request
    )

  act('take', take)
  act('release', (order, line, request) =>
    saveLine(db, order, { ...line, confirmationAgent: null, confirmationTakenAt: null }, request)
  )

  act('confirm', (order, line, request) => {
    if (lineOutOfTour(line)) throw conflict(PLANNING_MESSAGES.confirmationOutOfTour)
    const next = {
      ...line,
      confirmedAt: nowIsoDateTime(),
      confirmedBy: sessionUser(request).code,
      answerOrigin: 'agent' as const,
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
      answerOrigin: 'agent' as const,
      confirmedAt: null,
      confirmedBy: null
    }
    saveLine(db, order, next, request)
  })

  /* The date the recipient gives on the phone, from which he can be delivered (TRS01-US15): it
   * replaces a date the planner proposed, which he thereby refuses. Retaining it, or proposing
   * another, is the planner's, on the order card (TRS01-US16). */
  act('client-date', (order, line, request) => {
    const date = readDate(readBody(request), 'date', { required: true })
    saveLine(
      db,
      order,
      { ...line, clientProposedOn: date, plannerProposedOn: null, answerOrigin: 'agent' },
      request
    )
  })
}
