import {
  linesSummary,
  requestLines
} from '@/modules/planning/delivery-requests/domain/deliveryRequest'
import { emptyFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { emptyQuality } from '@/modules/planning/delivery-quality/domain/quality'
import { emptyDossier } from '@/modules/planning/closing/domain/closing'
import {
  plannerRetains,
  replanCandidate,
  type ReplanCandidate
} from '@/modules/planning/transport-orders/domain/replanning'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { readBody, routeParam } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { CIRCUIT_MESSAGES } from './circuitMessages'
import { nextDeliveryRequestNo } from './deliveryRequests'
import { planningSettings } from './settings'
import { nextTransportOrderNo, transportOrdersApi } from './transportOrders'

/** Who replans: the planner on the order card, or the recipient agreeing to a proposed date. */
type Actor = { code: string; request?: MockRequest }

const stamp = (actor: Actor) => ({ modifiedAt: nowIsoDateTime(), modifiedBy: actor.code })

const event = (
  actor: Actor,
  kind: TransportOrderRow['events'][number]['kind'],
  detail: string
) => ({
  at: nowIsoDateTime(),
  by: actor.code,
  kind,
  detail
})

/**
 * The pending order of a day, which gathers every line replanned to that day whatever its
 * original order (TRS01-US16): created the first time, with the departure time of the settings.
 */
function pendingOrderOf(db: MockDatabase, date: string, actor: Actor): TransportOrderRow {
  const status = new Map(transportOrdersApi(db).map((order) => [order.no, order.status]))
  const existing = db.transportOrders
    .all()
    .find((order) => order.replanDate === date && status.get(order.no) === 'draft')
  if (existing) return existing
  const time = planningSettings(db).schedule.defaultDepartureTime || '08:00'
  const no = nextTransportOrderNo(db)
  const at = nowIsoDateTime()
  const row: TransportOrderRow = {
    no,
    routeTemplateNo: null,
    plannedDeparture: `${date}T${time}:00`,
    comment: '',
    lines: [],
    means: null,
    tripNo: null,
    carrierNo: null,
    carrierVehiclePlate: '',
    carrierDriverName: '',
    carrierDepartedAt: null,
    carrierArrivedAt: null,
    ...emptyDossier(),
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    replanDate: date,
    events: [event(actor, 'created', date)],
    createdAt: at,
    createdBy: actor.code,
    modifiedAt: at,
    modifiedBy: actor.code
  }
  db.transportOrders.insert(row)
  return row
}

/**
 * The order (commande) the replanned part rides on. A line that carries its whole order moves
 * with it; otherwise the part becomes an order of its own, child of the first, so that each order
 * is held by one transport order and nothing is keyed again.
 */
function requestFor(
  db: MockDatabase,
  line: TransportOrderLineRow,
  candidate: ReplanCandidate,
  date: string,
  pendingNo: string,
  actor: Actor
): { requestNo: string | null; requestLineNo: number | null } {
  const source = line.deliveryRequestNo ? db.deliveryRequests.find(line.deliveryRequestNo) : null
  if (!source) return { requestNo: null, requestLineNo: null }
  const all = requestLines(source)
  const lineNo = line.requestLineNo ?? 1
  const whole = candidate.kind !== 'remainder' && all.length === 1
  if (whole) {
    db.deliveryRequests.update(source.no, {
      transportOrderNo: pendingNo,
      desiredDate: date,
      ...stamp(actor)
    })
    return { requestNo: source.no, requestLineNo: lineNo }
  }
  const part = {
    lineNo: 1,
    productNo: line.productNo,
    quantity: candidate.quantity,
    weightKg: candidate.weightKg,
    volumeM3: candidate.volumeM3
  }
  const no = nextDeliveryRequestNo(db)
  const at = nowIsoDateTime()
  db.deliveryRequests.insert({
    ...source,
    no,
    externalReference: source.externalReference,
    parentNo: source.parentNo ?? source.no,
    desiredDate: date,
    validUntil: null,
    transportOrderNo: pendingNo,
    lines: [part],
    ...linesSummary([part]),
    rejectionReasonNo: null,
    rejectionComment: '',
    rejectedAt: null,
    rejectedBy: null,
    ordererSurvey: null,
    createdAt: at,
    createdBy: actor.code,
    modifiedAt: at,
    modifiedBy: actor.code
  })
  // The line leaves its first order, which keeps only the others; a remainder leaves it whole.
  if (candidate.kind !== 'remainder') {
    const rest = all.filter((item) => item.lineNo !== lineNo)
    db.deliveryRequests.update(source.no, { lines: rest, ...linesSummary(rest), ...stamp(actor) })
  }
  return { requestNo: no, requestLineNo: 1 }
}

/**
 * Takes a line out of its order and into the pending order of the retained day, with its weight
 * and its volume (TRS01-US16, US17): nothing is keyed again. The original line stays in its order
 * as history, marked replanned.
 */
export function replanLine(
  db: MockDatabase,
  orderNo: string,
  lineNo: number,
  date: string,
  actor: Actor
): TransportOrderRow {
  if (date < todayIso()) throw unprocessable(CIRCUIT_MESSAGES.replanDateInPast)
  const order = db.transportOrders.findOrFail(orderNo)
  const line = order.lines.find((item) => item.lineNo === lineNo)
  const candidate = line ? replanCandidate(line) : null
  if (!line || !candidate) throw conflict(CIRCUIT_MESSAGES.replanNotOpen)
  const pending = pendingOrderOf(db, date, actor)
  const { requestNo, requestLineNo } = requestFor(db, line, candidate, date, pending.no, actor)
  const nextLineNo = pending.lines.reduce((max, item) => Math.max(max, item.lineNo), 0) + 1
  const taken: TransportOrderLineRow = {
    lineNo: nextLineNo,
    deliveryRequestNo: requestNo,
    requestLineNo,
    deliveryPointNo: line.deliveryPointNo,
    productNo: line.productNo,
    quantity: candidate.quantity,
    weightKg: candidate.weightKg,
    volumeM3: candidate.volumeM3,
    ...emptyFollowUp(),
    ...emptyQuality(),
    replannedFrom: { orderNo: order.no, lineNo: line.lineNo }
  }
  const fresh = db.transportOrders.findOrFail(pending.no)
  db.transportOrders.update(pending.no, {
    lines: [...fresh.lines, taken],
    events: [...fresh.events, event(actor, 'replan_received', `${order.no}/${line.lineNo}`)],
    ...stamp(actor)
  })
  const at = nowIsoDateTime()
  const updated: TransportOrderLineRow =
    candidate.kind === 'remainder'
      ? {
          ...line,
          remainderAt: at,
          remainderRequestNo: requestNo,
          replannedOn: date,
          replannedToOrderNo: pending.no
        }
      : { ...line, replannedAt: at, replannedOn: date, replannedToOrderNo: pending.no }
  const current = db.transportOrders.findOrFail(order.no)
  db.transportOrders.update(order.no, {
    lines: current.lines.map((item) => (item.lineNo === line.lineNo ? updated : item)),
    events: [
      ...current.events,
      event(actor, candidate.kind === 'remainder' ? 'remainder' : 'replanned', pending.no)
    ],
    ...stamp(actor)
  })
  return db.transportOrders.findOrFail(pending.no)
}

/** The planner proposes a date to an unavailable recipient; it waits for his agreement. */
export function proposeReplanDate(
  db: MockDatabase,
  orderNo: string,
  lineNo: number,
  date: string,
  actor: Actor
): void {
  if (date < todayIso()) throw unprocessable(CIRCUIT_MESSAGES.replanDateInPast)
  const order = db.transportOrders.findOrFail(orderNo)
  const line = order.lines.find((item) => item.lineNo === lineNo)
  const candidate = line ? replanCandidate(line) : null
  if (!line || candidate?.kind !== 'unavailable') throw conflict(CIRCUIT_MESSAGES.replanNotOpen)
  db.transportOrders.update(order.no, {
    lines: order.lines.map((item) =>
      item.lineNo === lineNo ? { ...item, plannerProposedOn: date } : item
    ),
    ...stamp(actor)
  })
}

export function registerReplanningHandlers(router: MockRouter, db: MockDatabase): void {
  const base = '/planning/transport-orders/:no/lines/:lineNo/replan'
  const params = (request: MockRequest) => ({
    orderNo: routeParam(request, 'no'),
    lineNo: Number(routeParam(request, 'lineNo'))
  })
  const actorOf = (request: MockRequest): Actor => ({ code: sessionUser(request).code, request })

  /* The planner accepts the date the recipient gave (TRS01-US16): the normal path. For a
   * postponement or a remainder he chooses the date himself (TRS01-US17, TRS03-US13). */
  router.post(base, { feature: 'TRANSPORTORDER', action: 'update' }, (request) => {
    const { orderNo, lineNo } = params(request)
    const order = db.transportOrders.findOrFail(orderNo)
    const line = order.lines.find((item) => item.lineNo === lineNo)
    const candidate = line ? replanCandidate(line) : null
    if (!candidate) throw conflict(CIRCUIT_MESSAGES.replanNotOpen)
    const asked = readDate(readBody(request), 'date')
    let date: string | null
    if (plannerRetains(candidate)) {
      date = asked ?? candidate.recipientDate
    } else {
      // An unavailable recipient decides: only his own date is retained by the planner.
      if (asked && asked !== candidate.recipientDate) {
        throw conflict(CIRCUIT_MESSAGES.replanAwaitsRecipient)
      }
      date = candidate.recipientDate
    }
    if (!date) throw unprocessable(CIRCUIT_MESSAGES.replanDateMissing)
    const pending = replanLine(db, orderNo, lineNo, date, actorOf(request))
    return ok(transportOrdersApi(db).find((item) => item.no === pending.no))
  })

  /* A date the planner proposes, when the recipient gave none or as a counter-proposal: it stays
   * proposed until the recipient agrees on his page (TRS01-US16). */
  router.post(`${base}/propose`, { feature: 'TRANSPORTORDER', action: 'update' }, (request) => {
    const { orderNo, lineNo } = params(request)
    const date = readDate(readBody(request), 'date', { required: true })!
    proposeReplanDate(db, orderNo, lineNo, date, actorOf(request))
    return ok(transportOrdersApi(db).find((item) => item.no === orderNo))
  })
}
