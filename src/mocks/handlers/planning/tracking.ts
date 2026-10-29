import {
  confirmationState,
  firstArrivalMarked,
  lineOutOfTour,
  linesConfirmed
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import {
  recipientDates,
  replanCandidate
} from '@/modules/planning/transport-orders/domain/replanning'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import { addDays, nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { readBody, routeParam } from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import { invalidField, readDate, readNumber, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { PLANNING_MESSAGES } from './messages'
import { transportOrdersApi } from './transportOrders'
import { orderEta } from './eta'
import { readReason } from './planningReasons'
import { deliveryNoteOf } from './deliveryNotes'
import type { DeliveryNoteApi } from '@/modules/planning/delivery-notes/types/deliveryNote.types'
import { replanLine } from './replanning'
import { CIRCUIT_MESSAGES } from './circuitMessages'

/**
 * The link sent to the recipient by SMS, WhatsApp or e-mail (review of 22 October): without
 * signing in, the recipient sees what is coming, confirms that he can receive it, or says he
 * cannot and gives another date; when he gives none, the next day after the planned one is
 * proposed. The agent then handles the new date as for an answer taken on the phone.
 */
export interface TrackingApi {
  orderNo: string
  lineNo: number
  recipientName: string
  deliveryPointName: string
  productName: string
  quantity: number
  unit: string
  plannedDeparture: string | null
  preferredSlot: string
  state: string
  /** The date proposed when the recipient is not available and gives none. */
  proposedDate: string
  availableOn: string | null
  /** A new date proposed by the planner, that the recipient accepts or answers with another. */
  plannerProposedOn: string | null
  /** The reasons the recipient can give for not being available. */
  reasons: { no: string; name: string }[]
  open: boolean
  /** Progress in four steps (TRS02-US04); the last is reached by the recipient's own confirmation. */
  step: 'planned' | 'on_the_way' | 'on_site' | 'received'
  /** What was loaded for him, once the load is checked (TRS02-US05). */
  loadedQuantity: number | null
  loadedOn: string | null
  notLoaded: boolean
  arrivedAt: string | null
  declaredAt: string | null
  receivedQuantity: number | null
  refusedAt: string | null
  refusalReason: string
  receptionConfirmedAt: string | null
  receptionConfirmedBy: string
  receptionContestedAt: string | null
  contestReason: string
  contestReasons: { no: string; name: string }[]
  refusalReasons: { no: string; name: string }[]
  /** What the planned message gives him: vehicle, driver and estimated arrival (TRS02-US02). */
  vehiclePlate: string
  driverName: string
  expectedArrival: string | null
  late: boolean
  /** His own answer to the satisfaction survey, once he confirmed (TRS04-US06). */
  satisfactionScore: number | null
  satisfactionComment: string
  /** The messages sent to him as his delivery moves on (TRS02-US02). */
  messages: { at: string; channel: string; kind: string; to?: string }[]
  /** His electronic delivery note, once the driver has declared (TRS05-US03). */
  deliveryNote: DeliveryNoteApi | null
  /** The day retained for what was not delivered or postponed, and its new link once planned
   * (TRS01-US16, US17). */
  replannedOn: string | null
  nextTrackingToken: string | null
  /** Postponed on site, with its reason, and whether the goods went back to the warehouse. */
  postponedAt: string | null
  postponementReason: string
  returnedAt: string | null
  /** The whole order was cancelled, with its reason. */
  cancelledAt: string | null
  cancellationReason: string
  /** Out of the order during the trip (postponed, a remainder) or after: he gives or accepts a
   * date as before loading (TRS01-US16). */
  replanOpen: boolean
  /** An order delivered in several trucks: each of its deliveries, with its truck and its link. */
  parts: TrackingPartApi[]
}

export interface TrackingPartApi {
  requestNo: string
  quantity: number
  unit: string
  vehiclePlate: string
  plannedDeparture: string | null
  expectedArrival: string | null
  state:
    | 'to_plan'
    | 'planned'
    | 'on_the_way'
    | 'declared'
    | 'received'
    | 'refused'
    | 'to_replan'
    | 'cancelled'
  trackingToken: string | null
  current: boolean
}

function find(
  db: MockDatabase,
  token: string
): { order: TransportOrderRow; line: TransportOrderLineRow } {
  for (const order of db.transportOrders.all()) {
    const line = order.lines.find((item) => item.trackingToken === token)
    if (line) {
      if (line.trackingExpiresOn && line.trackingExpiresOn < todayIso()) {
        throw notFound(PLANNING_MESSAGES.trackingExpired)
      }
      return { order, line }
    }
  }
  throw notFound(PLANNING_MESSAGES.trackingUnknown)
}

/** The recipient answers while the order is planned or confirmed, before the vehicle leaves. */
function isOpen(db: MockDatabase, order: TransportOrderRow, line: TransportOrderLineRow): boolean {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const status = transportOrderStatus({
    cancelledAt: order.cancelledAt,
    means: order.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(order.lines),
    firstArrival: firstArrivalMarked(order.lines)
  })
  return (status === 'planned' || status === 'confirmed') && !line.replannedAt
}

/** Out of his order once it left (postponed, a remainder, unavailable): he still gives or accepts
 * a date, until one is retained (TRS01-US16, US17). */
function replanOpen(db: MockDatabase, order: TransportOrderRow, line: TransportOrderLineRow) {
  if (order.cancelledAt) return false
  const status = statusOf(db, order)
  if (status !== 'in_progress' && status !== 'completed') return false
  const candidate = replanCandidate(line)
  return !!candidate && recipientDates(candidate)
}

/** The deliveries of an order split into several parts, each in its own truck (TRS01-US06). */
function orderParts(db: MockDatabase, current: TransportOrderLineRow): TrackingPartApi[] {
  const request = current.deliveryRequestNo
    ? db.deliveryRequests.find(current.deliveryRequestNo)
    : undefined
  if (!request) return []
  const root = request.parentNo ?? request.no
  const family = db.deliveryRequests
    .all()
    .filter(
      (row) =>
        (row.no === root || row.parentNo === root) && (!row.cancelledAt || row.no === request.no)
    )
  if (family.length < 2) return []
  const orders = db.transportOrders.all()
  return family.map((part) => {
    let found: { order: TransportOrderRow; line: TransportOrderLineRow } | null = null
    for (const order of orders) {
      for (const line of order.lines) {
        if (line.deliveryRequestNo === part.no && !line.replannedAt) found = { order, line }
      }
    }
    const product = db.products.find(part.productNo)
    const base = {
      requestNo: part.no,
      quantity: part.quantity,
      unit: product?.unit ?? '',
      current: found ? found.line.trackingToken === current.trackingToken : part.no === request.no
    }
    if (!found) {
      return {
        ...base,
        vehiclePlate: '',
        plannedDeparture: null,
        expectedArrival: null,
        state: part.cancelledAt ? 'cancelled' : 'to_plan',
        trackingToken: null
      }
    }
    const { order, line } = found
    const status = statusOf(db, order)
    const vehicle = vehicleOf(db, order)
    const state: TrackingPartApi['state'] =
      part.cancelledAt || order.cancelledAt
        ? 'cancelled'
        : line.receptionConfirmedAt
          ? 'received'
          : line.declaredAt
            ? 'declared'
            : line.refusalAt
              ? 'refused'
              : lineOutOfTour(line) || line.postponedAt
                ? 'to_replan'
                : status === 'in_progress'
                  ? 'on_the_way'
                  : status === 'draft'
                    ? 'to_plan'
                    : 'planned'
    return {
      ...base,
      vehiclePlate: vehicle.vehiclePlate,
      plannedDeparture: order.plannedDeparture,
      expectedArrival:
        state === 'planned' || state === 'on_the_way' ? vehicle.expectedArrival : null,
      state,
      trackingToken: line.trackingToken
    }
  })
}

/** The order's status as everywhere else in the application. */
function statusOf(db: MockDatabase, order: TransportOrderRow): string {
  return transportOrdersApi(db).find((item) => item.no === order.no)?.status ?? 'draft'
}

function vehicleOf(db: MockDatabase, order: TransportOrderRow) {
  const item = transportOrdersApi(db).find((row) => row.no === order.no)
  const carrier = item?.means === 'carrier'
  return {
    vehiclePlate: (carrier ? item?.carrierVehiclePlate : item?.vehiclePlate) ?? '',
    driverName: (carrier ? item?.carrierDriverName : item?.driverName) ?? '',
    // The estimated arrival moves with the position of the vehicle (TRS02-US01).
    expectedArrival: orderEta(db, order).expectedArrival,
    late: orderEta(db, order).late
  }
}

const reasonList = (db: MockDatabase, kind: string) =>
  db.planningReasons
    .all()
    .filter((reason) => reason.kind === kind && reason.active)
    .map((reason) => ({ no: reason.no, name: reason.name }))

function trackingApi(
  db: MockDatabase,
  order: TransportOrderRow,
  line: TransportOrderLineRow
): TrackingApi {
  const point = db.deliveryPoints.find(line.deliveryPointNo)
  const recipient = point ? db.customers.find(point.customerNo) : undefined
  const product = db.products.find(line.productNo)
  const request = line.deliveryRequestNo
    ? db.deliveryRequests.find(line.deliveryRequestNo)
    : undefined
  const planned = (order.plannedDeparture ?? todayIso()).slice(0, 10)
  return {
    orderNo: order.no,
    lineNo: line.lineNo,
    recipientName: recipient?.name ?? '',
    deliveryPointName: point?.name ?? '',
    productName: product?.name ?? '',
    quantity: line.quantity,
    unit: product?.unit ?? '',
    plannedDeparture: order.plannedDeparture,
    preferredSlot: request?.preferredSlot ?? recipient?.preferredSlot ?? 'any',
    state: confirmationState(line),
    proposedDate: addDays(planned, 1),
    availableOn: line.availableOn,
    plannerProposedOn: line.plannerProposedOn,
    reasons: reasonList(db, 'unavailability'),
    open: isOpen(db, order, line),
    step: line.receptionConfirmedAt
      ? 'received'
      : line.arrivedAt
        ? 'on_site'
        : statusOf(db, order) === 'in_progress' || statusOf(db, order) === 'completed'
          ? 'on_the_way'
          : 'planned',
    loadedQuantity: line.conformingAt ? line.loadedQuantity : null,
    loadedOn: line.conformingAt,
    notLoaded: !!line.nonconformityAt,
    arrivedAt: line.arrivedAt ?? null,
    declaredAt: line.declaredAt,
    receivedQuantity: line.receivedQuantity,
    refusedAt: line.refusalAt,
    refusalReason: db.planningReasons.find(line.refusalReasonNo ?? '')?.name ?? '',
    receptionConfirmedAt: line.receptionConfirmedAt,
    receptionConfirmedBy: line.receptionConfirmedBy,
    receptionContestedAt: line.receptionContestedAt,
    contestReason: db.planningReasons.find(line.contestReasonNo ?? '')?.name ?? '',
    contestReasons: reasonList(db, 'contestation'),
    refusalReasons: reasonList(db, 'delivery_refusal'),
    deliveryNote: deliveryNoteOf(db, order, line.deliveryPointNo),
    ...vehicleOf(db, order),
    satisfactionScore: line.satisfactionScore,
    satisfactionComment: line.satisfactionComment,
    messages: line.recipientMessages ?? [],
    replannedOn: line.replannedOn ?? null,
    nextTrackingToken: nextToken(db, order.no, line.lineNo),
    postponedAt: line.postponedAt,
    postponementReason: db.planningReasons.find(line.postponementReasonNo ?? '')?.name ?? '',
    returnedAt: line.returnedAt,
    cancelledAt: order.cancelledAt,
    cancellationReason: db.planningReasons.find(order.cancellationReasonNo ?? '')?.name ?? '',
    replanOpen: replanOpen(db, order, line),
    parts: orderParts(db, line)
  }
}

/** The link of the line that took this one over, once its order is planned. */
function nextToken(db: MockDatabase, orderNo: string, lineNo: number): string | null {
  for (const order of db.transportOrders.all()) {
    const next = order.lines.find(
      (item) => item.replannedFrom?.orderNo === orderNo && item.replannedFrom.lineNo === lineNo
    )
    if (next) return next.trackingToken
  }
  return null
}

/** Applies a change to every declared line of the recipient's delivery (same point). */
function saveDelivery(
  db: MockDatabase,
  order: TransportOrderRow,
  pointNo: string,
  change: (line: TransportOrderLineRow) => TransportOrderLineRow
): void {
  db.transportOrders.update(order.no, {
    lines: order.lines.map((item) =>
      item.deliveryPointNo === pointNo && item.declaredAt ? change(item) : item
    ),
    modifiedAt: nowIsoDateTime(),
    modifiedBy: 'destinataire'
  })
}

function save(
  db: MockDatabase,
  order: TransportOrderRow,
  next: TransportOrderLineRow,
  kind: 'confirmed' | 'refused' | null
): void {
  db.transportOrders.update(order.no, {
    lines: order.lines.map((item) => (item.lineNo === next.lineNo ? next : item)),
    events: kind
      ? [
          ...order.events,
          { at: nowIsoDateTime(), by: 'destinataire', kind, detail: String(next.lineNo) }
        ]
      : order.events,
    modifiedAt: nowIsoDateTime(),
    modifiedBy: 'destinataire'
  })
}

export function registerTrackingHandlers(router: MockRouter, db: MockDatabase): void {
  const base = '/public/tracking/:token'

  router.get(base, { public: true }, (request) => {
    const { order, line } = find(db, routeParam(request, 'token'))
    return ok(trackingApi(db, order, line))
  })

  router.post(`${base}/confirm`, { public: true }, (request) => {
    const { order, line } = find(db, routeParam(request, 'token'))
    if (!isOpen(db, order, line)) throw conflict(PLANNING_MESSAGES.confirmationClosed)
    save(
      db,
      order,
      {
        ...line,
        confirmedAt: nowIsoDateTime(),
        confirmedBy: 'destinataire',
        answerOrigin: 'link',
        unavailableAt: null,
        unavailabilityReasonNo: null,
        unavailabilityComment: '',
        availableOn: null,
        clientProposedOn: null
      },
      'confirmed'
    )
    const updated = find(db, routeParam(request, 'token'))
    return ok(trackingApi(db, updated.order, updated.line))
  })

  /* After the driver's declaration, the recipient confirms with his name, which signs the
   * delivery, or contests it; a contested delivery is then the planner's (TRS04-US02). */
  router.post(`${base}/receive-confirm`, { public: true }, (request) => {
    const { order, line } = find(db, routeParam(request, 'token'))
    if (!line.declaredAt) throw conflict(PLANNING_MESSAGES.trackingNotDeclared)
    if (line.receptionConfirmedAt || line.receptionContestedAt) {
      throw conflict(PLANNING_MESSAGES.receptionAlreadyConfirmed)
    }
    const signer = readString(readBody(request), 'signer', { required: true })
    const at = nowIsoDateTime()
    saveDelivery(db, order, line.deliveryPointNo, (item) => ({
      ...item,
      receptionConfirmedAt: at,
      receptionConfirmedBy: signer
    }))
    const updated = find(db, routeParam(request, 'token'))
    return ok(trackingApi(db, updated.order, updated.line))
  })

  router.post(`${base}/receive-contest`, { public: true }, (request) => {
    const { order, line } = find(db, routeParam(request, 'token'))
    if (!line.declaredAt) throw conflict(PLANNING_MESSAGES.trackingNotDeclared)
    if (line.receptionConfirmedAt || line.receptionContestedAt) {
      throw conflict(PLANNING_MESSAGES.receptionAlreadyConfirmed)
    }
    const reason = readReason(db, readBody(request), 'contestation')
    const at = nowIsoDateTime()
    saveDelivery(db, order, line.deliveryPointNo, (item) => ({
      ...item,
      receptionContestedAt: at,
      contestReasonNo: reason.reasonNo,
      contestComment: reason.comment
    }))
    const updated = find(db, routeParam(request, 'token'))
    return ok(trackingApi(db, updated.order, updated.line))
  })

  /* While the driver is on site and has not declared, the recipient can still refuse, with a
   * reason; the result is the same as a refusal the driver records on the spot (TRS04-US04). */
  router.post(`${base}/refuse`, { public: true }, (request) => {
    const { order, line } = find(db, routeParam(request, 'token'))
    if (!line.arrivedAt || line.declaredAt || line.refusalAt) {
      throw conflict(PLANNING_MESSAGES.trackingCannotRefuse)
    }
    const reason = readReason(db, readBody(request), 'delivery_refusal')
    save(
      db,
      order,
      {
        ...line,
        refusalAt: nowIsoDateTime(),
        refusalReasonNo: reason.reasonNo,
        refusalComment: reason.comment,
        refusalBy: 'recipient'
      },
      'refused'
    )
    const updated = find(db, routeParam(request, 'token'))
    return ok(trackingApi(db, updated.order, updated.line))
  })

  /* Once he confirmed the receipt himself, the recipient may answer the survey: a score from
   * 1 to 5 and a comment, optional; the planner reads it on the order card (TRS04-US06). */
  router.post(`${base}/satisfaction`, { public: true }, (request) => {
    const { order, line } = find(db, routeParam(request, 'token'))
    if (!line.receptionConfirmedAt || line.satisfactionScore !== null) {
      throw conflict(PLANNING_MESSAGES.receptionSatisfactionClosed)
    }
    const body = readBody(request)
    const score = readNumber(body, 'score', { required: true, min: 1, max: 5 })!
    if (!Number.isInteger(score)) throw invalidField('score')
    const comment = readString(body, 'comment')
    saveDelivery(db, order, line.deliveryPointNo, (item) => ({
      ...item,
      satisfactionScore: score,
      satisfactionComment: comment
    }))
    const updated = find(db, routeParam(request, 'token'))
    return ok(trackingApi(db, updated.order, updated.line))
  })

  /* The recipient agrees to the date the planner proposed: that date is retained and the line is
   * taken into the pending order of that day at once (TRS01-US16). */
  router.post(`${base}/accept-proposal`, { public: true }, (request) => {
    const { order, line } = find(db, routeParam(request, 'token'))
    if (!isOpen(db, order, line) && !replanOpen(db, order, line)) {
      throw conflict(PLANNING_MESSAGES.confirmationClosed)
    }
    if (!line.plannerProposedOn) throw conflict(PLANNING_MESSAGES.confirmationDateMissing)
    const date = line.plannerProposedOn
    save(
      db,
      order,
      { ...line, clientProposedOn: date, availableOn: date, answerOrigin: 'link' },
      null
    )
    replanLine(db, order.no, line.lineNo, date, { code: 'destinataire' })
    const updated = find(db, routeParam(request, 'token'))
    return ok(trackingApi(db, updated.order, updated.line))
  })

  router.post(`${base}/unavailable`, { public: true }, (request) => {
    const { order, line } = find(db, routeParam(request, 'token'))
    /* Once his line left the order (postponed, a remainder): he gives the day from which he can
     * be delivered, or answers the planner's proposal with his own (TRS01-US16 CA01, CA03). */
    if (!isOpen(db, order, line) && replanOpen(db, order, line)) {
      const date = readDate(readBody(request), 'date', { required: true })!
      if (date < todayIso()) throw unprocessable(CIRCUIT_MESSAGES.replanDateInPast)
      save(
        db,
        order,
        {
          ...line,
          availableOn: date,
          clientProposedOn: date,
          plannerProposedOn: null,
          answerOrigin: 'link'
        },
        null
      )
      const updated = find(db, routeParam(request, 'token'))
      return ok(trackingApi(db, updated.order, updated.line))
    }
    if (!isOpen(db, order, line)) throw conflict(PLANNING_MESSAGES.confirmationClosed)
    const planned = (order.plannedDeparture ?? todayIso()).slice(0, 10)
    const body = readBody(request)
    // A reason is required, as when the agent records the answer on the phone.
    const reason = readReason(db, body, 'unavailability')
    const date = readDate(body, 'date') ?? addDays(planned, 1)
    if (date <= planned) throw unprocessable(PLANNING_MESSAGES.trackingDateTooEarly)
    save(
      db,
      order,
      {
        ...line,
        unavailableAt: nowIsoDateTime(),
        unavailabilityReasonNo: reason.reasonNo,
        unavailabilityComment: reason.comment,
        availableOn: date,
        clientProposedOn: date,
        // Giving his own date refuses the one the planner proposed (TRS01-US16).
        plannerProposedOn: null,
        answerOrigin: 'link',
        confirmedAt: null,
        confirmedBy: null
      },
      null
    )
    const updated = find(db, routeParam(request, 'token'))
    return ok(trackingApi(db, updated.order, updated.line))
  })
}
