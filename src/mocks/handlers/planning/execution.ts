import { applicableTolerance } from '@/modules/planning/quantity-tolerances/domain/quantityTolerance'
import {
  linesDelivered,
  qualificationFits,
  receivedQuantityDecision,
  type GapQualification
} from '@/modules/planning/execution/domain/execution'
import {
  lineOutOfTour,
  firstArrivalMarked,
  linesConfirmed
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import { loadingReady } from '@/modules/planning/loading/domain/loading'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, forbidden, unprocessable } from '../../http/errors'
import { invalidField, readDate, readNumber, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { messageRecipients } from './recipientMessages'
import { planningSettings } from './settings'
import { readReason } from './planningReasons'

const TRIP_DEPARTED = ['in_progress', 'completed', 'closed']

/** Goods the driver still has to bring back: refused, postponed with return, or left undelivered. */
export const toBringBack = (line: TransportOrderLineRow) =>
  (!!line.refusalAt || !!line.returnedAt || !!line.undeliveredReasonNo) &&
  !line.handedBackAt &&
  !line.warehouseReceivedAt

function statusOf(db: MockDatabase, order: TransportOrderRow) {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const fleetDeparted = !!trip && TRIP_DEPARTED.includes(trip.status)
  return transportOrderStatus({
    cancelledAt: order.cancelledAt,
    means: order.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(order.lines),
    firstArrival: firstArrivalMarked(order.lines),
    loadingReady: loadingReady(order.lines),
    carrierDeparted: order.carrierDepartedAt !== null || fleetDeparted,
    linesDelivered: linesDelivered(order.lines),
    closedAt: order.closedAt
  })
}

function onTheRoad(db: MockDatabase, order: TransportOrderRow): boolean {
  const status = statusOf(db, order)
  return status === 'in_progress'
}

function save(
  db: MockDatabase,
  order: TransportOrderRow,
  patch: Partial<TransportOrderRow>,
  request: MockRequest,
  kind: 'departed' | 'declared' | 'refused' | 'postponed' | 'qualified' | 'correction' | 'retried',
  detail: string
): void {
  db.transportOrders.update(order.no, {
    ...patch,
    events: [
      ...order.events,
      { at: nowIsoDateTime(), by: sessionUser(request).code, kind, detail }
    ],
    ...stampModified(request)
  })
}

/**
 * What a delivered quantity is compared with, and the tolerance that applies to it: the loaded
 * quantity, or for fuel the loaded volume at 15 °C, which neutralises the expansion (TRS03-US16).
 */
export function gapReference(
  db: MockDatabase,
  order: TransportOrderRow,
  line: TransportOrderLineRow
) {
  const fuel = !!db.products.find(line.productNo)?.isFuel
  const loaded15 = (order.pickup?.entries ?? [])
    .filter((entry) => entry.lineNo === line.lineNo && entry.volume15L !== null)
    .reduce((sum, entry) => sum + (entry.volume15L ?? 0), 0)
  const point = db.deliveryPoints.findOrFail(line.deliveryPointNo)
  const applicable = applicableTolerance(
    db.quantityTolerances.all(),
    point.customerNo,
    line.productNo
  )
  return {
    loaded: line.loadedQuantity ?? line.quantity,
    loaded15L: fuel && loaded15 > 0 ? loaded15 : null,
    rule: applicable?.rule ?? null
  }
}

/** The points of an order in their execution order, without the lines out of the route. */
export function routePoints(order: TransportOrderRow): string[] {
  const route = order.lines.filter((item) => !item.unavailableAt && !item.replannedAt)
  return [...new Set(route.map((item) => item.deliveryPointNo))]
}

/** A fleet order the signed-in driver is assigned to; any other is not his. */
export function driverOrder(
  db: MockDatabase,
  orderNo: string,
  request: MockRequest
): TransportOrderRow {
  const order = db.transportOrders.findOrFail(orderNo)
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const employeeNo = sessionUser(request).employeeNo
  if (!trip || !employeeNo || trip.driverNo !== employeeNo || order.cancelledAt) {
    throw forbidden(PLANNING_MESSAGES.executionNotYourOrder)
  }
  return order
}

export function registerExecutionHandlers(router: MockRouter, db: MockDatabase): void {
  /* Orders the driver's arrival has just started: their recipients are told (TRS02-US02). */
  const startedOrders = new Set<string>()
  router.post(
    '/planning/transport-orders/:no/depart',
    { feature: 'TRANSPORTORDER', action: 'execute' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (order.means !== 'carrier') throw conflict(PLANNING_MESSAGES.executionNotCarrier)
      if (statusOf(db, order) !== 'ready') throw conflict(PLANNING_MESSAGES.executionNotReady)
      save(db, order, { carrierDepartedAt: nowIsoDateTime() }, request, 'departed', order.no)
      messageRecipients(db, order.no, 'started')
      return ok({ status: statusOf(db, db.transportOrders.findOrFail(order.no)) })
    }
  )

  router.post(
    '/planning/transport-orders/:no/arrive',
    { feature: 'TRANSPORTORDER', action: 'execute' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (order.means !== 'carrier' || !order.carrierDepartedAt) {
        throw conflict(PLANNING_MESSAGES.executionNotCarrier)
      }
      save(db, order, { carrierArrivedAt: nowIsoDateTime() }, request, 'departed', 'arrived')
      return ok({ arrived: true })
    }
  )

  /** What the driver does on the spot; for a fleet order, only he does it, from his space. */
  const DRIVER_ACTIONS = ['declare', 'refuse', 'postpone']

  const runLineAction = (
    order: TransportOrderRow,
    lineNo: number,
    name: string,
    request: MockRequest,
    apply: (
      order: TransportOrderRow,
      line: TransportOrderLineRow,
      request: MockRequest
    ) => TransportOrderLineRow
  ) => {
    if (!onTheRoad(db, order)) throw conflict(PLANNING_MESSAGES.executionNotOnTheRoad)
    const line = order.lines.find((item) => item.lineNo === lineNo)
    if (!line) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
    const next = apply(order, line, request)
    save(
      db,
      order,
      { lines: order.lines.map((item) => (item.lineNo === lineNo ? next : item)) },
      request,
      name === 'declare'
        ? 'declared'
        : name === 'refuse'
          ? 'refused'
          : name === 'qualify'
            ? 'qualified'
            : 'postponed',
      String(lineNo)
    )
    if (name === 'declare')
      messageRecipients(db, order.no, 'declared', (item) => item.lineNo === lineNo)
    const updated = db.transportOrders.findOrFail(order.no)
    return ok({ status: statusOf(db, updated), delivered: linesDelivered(updated.lines) })
  }

  const lineAction = (
    name: string,
    apply: (
      order: TransportOrderRow,
      line: TransportOrderLineRow,
      request: MockRequest
    ) => TransportOrderLineRow,
    /* Qualifying a gap is the delivery manager's (TRS03-US17), not the planner's. */
    feature = name === 'qualify' ? 'DELIVERYQUALITY' : 'TRANSPORTORDER'
  ) => {
    router.post(
      `/planning/transport-orders/:no/lines/:lineNo/${name}`,
      { feature, action: 'execute' },
      (request) => {
        const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
        if (DRIVER_ACTIONS.includes(name) && order.means === 'fleet') {
          throw conflict(PLANNING_MESSAGES.executionByDriver)
        }
        return runLineAction(order, Number(routeParam(request, 'lineNo')), name, request, apply)
      }
    )
    if (!DRIVER_ACTIONS.includes(name)) return
    router.post(
      `/me/orders/:no/lines/:lineNo/${name}`,
      { feature: 'MYSPACE', action: 'execute' },
      (request) => {
        const order = driverOrder(db, routeParam(request, 'no'), request)
        const lineNo = Number(routeParam(request, 'lineNo'))
        const line = order.lines.find((item) => item.lineNo === lineNo)
        // Once arrived at the point, the driver declares what was delivered (TRS03-US09).
        if (name === 'declare' && line && !line.arrivedAt) {
          throw conflict(PLANNING_MESSAGES.executionNotArrived)
        }
        return runLineAction(order, lineNo, name, request, apply)
      }
    )
  }

  /* The driver declares the delivery of a point line by line (TRS03-US11): each product line is
   * proposed; an unchecked one needs a reason, and at least one must stay delivered, otherwise it
   * is a refusal or a postponement. For fuel he gives the measures: volume delivered, temperature,
   * density and volume at 15 °C, the reference the gap is checked against (TRS03-US10, US16). */
  router.post(
    '/me/orders/:no/points/:pointNo/declare',
    { feature: 'MYSPACE', action: 'execute' },
    (request) => {
      const order = driverOrder(db, routeParam(request, 'no'), request)
      if (!onTheRoad(db, order)) throw conflict(PLANNING_MESSAGES.executionNotOnTheRoad)
      const pointNo = routeParam(request, 'pointNo')
      const open = order.lines.filter(
        (line) =>
          line.deliveryPointNo === pointNo &&
          !lineOutOfTour(line) &&
          !line.declaredAt &&
          !line.refusalAt
      )
      if (!open.length) throw conflict(PLANNING_MESSAGES.executionLineSettled)
      if (!open.some((line) => line.arrivedAt))
        throw conflict(PLANNING_MESSAGES.executionNotArrived)
      const raw = readBody(request).lines
      if (!Array.isArray(raw)) throw invalidField('lines')
      const given = new Map<number, Record<string, unknown>>()
      for (const item of raw) {
        if (!item || typeof item !== 'object') throw invalidField('lines')
        const row = item as Record<string, unknown>
        given.set(Number(row.lineNo), row)
      }
      if (open.some((line) => !given.has(line.lineNo))) throw invalidField('lines')
      if (!open.some((line) => given.get(line.lineNo)!.delivered === true)) {
        throw unprocessable(PLANNING_MESSAGES.executionNothingDelivered)
      }
      const at = nowIsoDateTime()
      const user = sessionUser(request).code
      const next = new Map<number, TransportOrderLineRow>()
      for (const line of open) {
        const row = given.get(line.lineNo)!
        if (row.delivered !== true) {
          const reason = readReason(db, row, 'delivery_refusal')
          next.set(line.lineNo, {
            ...line,
            declaredAt: at,
            declaredBy: user,
            receivedQuantity: 0,
            quantityGap: null,
            undeliveredReasonNo: reason.reasonNo,
            undeliveredComment: reason.comment
          })
          continue
        }
        const product = db.products.find(line.productNo)
        const fuel = !!product?.isFuel
        const measure = (field: string, min: number, max: number) =>
          readNumber(row, field, { required: fuel, min, max })
        const measures = fuel
          ? {
              deliveredVolumeL: measure('deliveredVolumeL', 0, 100000),
              temperatureC: measure('temperatureC', -20, 60),
              density: measure('density', 0.5, 1.2),
              volume15L: measure('volume15L', 0, 100000)
            }
          : null
        const received =
          readNumber(row, 'receivedQuantity', { required: !fuel, min: 0 }) ??
          measures?.deliveredVolumeL ??
          0
        // For fuel the gap is read at 15 °C, which neutralises the expansion (TRS03-US16).
        const reference = gapReference(db, order, line)
        const compareLoaded = reference.loaded15L ?? reference.loaded
        const compareReceived =
          measures?.volume15L != null && reference.loaded15L !== null
            ? measures.volume15L
            : received
        const justification = readString(row, 'justification')
        const decision = receivedQuantityDecision(
          compareLoaded,
          compareReceived,
          reference.rule,
          planningSettings(db).quantities.overToleranceMode,
          justification
        )
        if (decision.blocked) throw unprocessable(PLANNING_MESSAGES.executionGapBlocked)
        next.set(line.lineNo, {
          ...line,
          declaredAt: at,
          declaredBy: user,
          receivedQuantity: received,
          quantityGap: decision.gap,
          gapComment: decision.outside ? justification : '',
          gapQualification: null,
          deliveryMeasures: measures
        })
      }
      save(
        db,
        order,
        { lines: order.lines.map((line) => next.get(line.lineNo) ?? line) },
        request,
        'declared',
        [...next.keys()].join(',')
      )
      messageRecipients(db, order.no, 'declared', (line) => next.has(line.lineNo))
      const updated = db.transportOrders.findOrFail(order.no)
      return ok({ status: statusOf(db, updated), delivered: linesDelivered(updated.lines) })
    }
  )

  /* The driver confirms he brought back to the warehouse what was not delivered; the reminder
   * stays in his space until then, even once the order is completed (TRS03-US11). */
  router.post(
    '/me/orders/:no/lines/:lineNo/hand-back',
    { feature: 'MYSPACE', action: 'execute' },
    (request) => {
      const order = driverOrder(db, routeParam(request, 'no'), request)
      const lineNo = Number(routeParam(request, 'lineNo'))
      const line = order.lines.find((item) => item.lineNo === lineNo)
      if (!line || !toBringBack(line)) throw conflict(PLANNING_MESSAGES.receptionNothingToReturn)
      db.transportOrders.update(order.no, {
        lines: order.lines.map((item) =>
          item.lineNo === lineNo ? { ...item, handedBackAt: nowIsoDateTime() } : item
        ),
        events: [
          ...order.events,
          {
            at: nowIsoDateTime(),
            by: sessionUser(request).code,
            kind: 'handed_back',
            detail: String(lineNo)
          }
        ],
        ...stampModified(request)
      })
      return ok({ handedBack: true })
    }
  )

  /* The driver marks his arrival at a point: on the first point of an order ready to go, this
   * gesture starts the execution; a point opens only once the previous one is settled. */
  router.post(
    '/me/orders/:no/lines/:lineNo/arrive',
    { feature: 'MYSPACE', action: 'execute' },
    (request) => {
      const order = driverOrder(db, routeParam(request, 'no'), request)
      const status = statusOf(db, order)
      if (status !== 'ready' && status !== 'in_progress') {
        throw conflict(PLANNING_MESSAGES.executionNotReady)
      }
      const lineNo = Number(routeParam(request, 'lineNo'))
      const target = order.lines.find((item) => item.lineNo === lineNo)
      if (!target) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
      const route = order.lines.filter((item) => !item.unavailableAt && !item.replannedAt)
      const points = [...new Set(route.map((item) => item.deliveryPointNo))]
      const index = points.indexOf(target.deliveryPointNo)
      const previous =
        index > 0 ? route.filter((item) => item.deliveryPointNo === points[index - 1]) : []
      const settled = (item: TransportOrderLineRow) =>
        !!item.declaredAt || !!item.refusalAt || !!item.postponedAt || !!item.nonconformityAt
      if (previous.some((item) => !settled(item))) {
        throw conflict(PLANNING_MESSAGES.executionPreviousOpen)
      }
      if (status === 'ready' && order.tripNo) {
        const trip = db.trips.findOrFail(order.tripNo)
        if (trip.status === 'planned') {
          db.trips.update(trip.no, { status: 'in_progress', actualDeparture: nowIsoDateTime() })
          startedOrders.add(order.no)
        }
      }
      const at = nowIsoDateTime()
      save(
        db,
        order,
        {
          lines: order.lines.map((item) =>
            item.deliveryPointNo === target.deliveryPointNo && !item.arrivedAt
              ? { ...item, arrivedAt: at }
              : item
          )
        },
        request,
        'departed',
        `arrivée ${target.deliveryPointNo}`
      )
      if (startedOrders.delete(order.no)) messageRecipients(db, order.no, 'started')
      return ok({ status: statusOf(db, db.transportOrders.findOrFail(order.no)) })
    }
  )

  /* Corrections of an entry made by mistake, always with the reason (v57, TRS03-US05, US10). The
   * non-conformity found at the loading check is withdrawn while the order is still being loaded
   * and the line is not replanned: the line comes back to the check. */
  router.post(
    '/me/orders/:no/lines/:lineNo/cancel-nonconformity',
    { feature: 'MYSPACE', action: 'execute' },
    (request) => {
      const order = driverOrder(db, routeParam(request, 'no'), request)
      const lineNo = Number(routeParam(request, 'lineNo'))
      const line = order.lines.find((item) => item.lineNo === lineNo)
      if (!line?.nonconformityAt) throw conflict(PLANNING_MESSAGES.correctionNoNonconformity)
      if (statusOf(db, order) !== 'confirmed')
        throw conflict(PLANNING_MESSAGES.correctionLoadingOver)
      if (line.replannedAt) throw conflict(PLANNING_MESSAGES.correctionReplanned)
      const comment = readString(readBody(request), 'comment', { required: true })
      save(
        db,
        order,
        {
          lines: order.lines.map((item) =>
            item.lineNo === lineNo
              ? {
                  ...item,
                  conformingAt: null,
                  nonconformityAt: null,
                  nonconformityReasonNo: null,
                  nonconformityComment: ''
                }
              : item
          )
        },
        request,
        'correction',
        `non-conformité ${lineNo} : ${comment}`
      )
      return ok({ status: statusOf(db, db.transportOrders.findOrFail(order.no)) })
    }
  )

  /* The declaration of a point is withdrawn while the recipient has neither confirmed nor
   * contested it and nothing undelivered was handed back or replanned: the point is to declare
   * again. */
  router.post(
    '/me/orders/:no/points/:pointNo/cancel-declaration',
    { feature: 'MYSPACE', action: 'execute' },
    (request) => {
      const order = driverOrder(db, routeParam(request, 'no'), request)
      if (!onTheRoad(db, order)) throw conflict(PLANNING_MESSAGES.executionNotOnTheRoad)
      const pointNo = routeParam(request, 'pointNo')
      const declared = order.lines.filter(
        (line) => line.deliveryPointNo === pointNo && line.declaredAt && !line.replannedAt
      )
      if (!declared.length) throw conflict(PLANNING_MESSAGES.correctionNotDeclared)
      if (declared.some((line) => line.receptionConfirmedAt || line.receptionContestedAt)) {
        throw conflict(PLANNING_MESSAGES.correctionReceptionAnswered)
      }
      if (declared.some((line) => line.handedBackAt || line.warehouseReceivedAt)) {
        throw conflict(PLANNING_MESSAGES.correctionGoodsBack)
      }
      if (declared.some((line) => line.remainderAt)) {
        throw conflict(PLANNING_MESSAGES.correctionReplanned)
      }
      const comment = readString(readBody(request), 'comment', { required: true })
      const lineNos = new Set(declared.map((line) => line.lineNo))
      save(
        db,
        order,
        {
          lines: order.lines.map((line) =>
            lineNos.has(line.lineNo)
              ? {
                  ...line,
                  declaredAt: null,
                  declaredBy: null,
                  receivedQuantity: null,
                  quantityGap: null,
                  gapQualification: null,
                  gapComment: '',
                  gapImputableToDriver: null,
                  undeliveredReasonNo: null,
                  undeliveredComment: '',
                  deliveryMeasures: null
                }
              : line
          )
        },
        request,
        'correction',
        `déclaration ${pointNo} : ${comment}`
      )
      return ok({ status: statusOf(db, db.transportOrders.findOrFail(order.no)) })
    }
  )

  /* A refusal recorded by mistake is withdrawn while the driver is still on site: no later point
   * is started, and the goods are not handed back. The recipient's own refusal stays his. */
  router.post(
    '/me/orders/:no/lines/:lineNo/cancel-refusal',
    { feature: 'MYSPACE', action: 'execute' },
    (request) => {
      const order = driverOrder(db, routeParam(request, 'no'), request)
      if (!onTheRoad(db, order)) throw conflict(PLANNING_MESSAGES.executionNotOnTheRoad)
      const lineNo = Number(routeParam(request, 'lineNo'))
      const line = order.lines.find((item) => item.lineNo === lineNo)
      if (!line?.refusalAt || line.incident || !line.arrivedAt) {
        throw conflict(PLANNING_MESSAGES.correctionNoRefusal)
      }
      if (line.refusalBy === 'recipient') {
        throw conflict(PLANNING_MESSAGES.correctionRefusedByRecipient)
      }
      if (line.handedBackAt || line.warehouseReceivedAt) {
        throw conflict(PLANNING_MESSAGES.correctionGoodsBack)
      }
      if (line.replannedAt) throw conflict(PLANNING_MESSAGES.correctionReplanned)
      const points = routePoints(order)
      const later = new Set(points.slice(points.indexOf(line.deliveryPointNo) + 1))
      if (order.lines.some((item) => later.has(item.deliveryPointNo) && item.arrivedAt)) {
        throw conflict(PLANNING_MESSAGES.correctionNextStarted)
      }
      const comment = readString(readBody(request), 'comment', { required: true })
      save(
        db,
        order,
        {
          lines: order.lines.map((item) =>
            item.lineNo === lineNo
              ? {
                  ...item,
                  refusalAt: null,
                  refusalReasonNo: null,
                  refusalComment: '',
                  refusalBy: null
                }
              : item
          )
        },
        request,
        'correction',
        `refus ${lineNo} : ${comment}`
      )
      return ok({ status: statusOf(db, db.transportOrders.findOrFail(order.no)) })
    }
  )

  /* A point simply postponed is retried at any time while the order runs (TRS03-US12): its lines
   * are to deliver again; a postponement with return to the warehouse is not retried. */
  router.post(
    '/me/orders/:no/points/:pointNo/retry',
    { feature: 'MYSPACE', action: 'execute' },
    (request) => {
      const order = driverOrder(db, routeParam(request, 'no'), request)
      if (!onTheRoad(db, order)) throw conflict(PLANNING_MESSAGES.executionNotOnTheRoad)
      const pointNo = routeParam(request, 'pointNo')
      const retried = order.lines.filter(
        (line) =>
          line.deliveryPointNo === pointNo &&
          line.postponedAt &&
          !line.returnedAt &&
          !line.declaredAt &&
          !line.refusalAt &&
          !lineOutOfTour(line)
      )
      if (!retried.length) throw conflict(PLANNING_MESSAGES.executionNothingToRetry)
      const lineNos = new Set(retried.map((line) => line.lineNo))
      save(
        db,
        order,
        {
          lines: order.lines.map((line) =>
            lineNos.has(line.lineNo)
              ? {
                  ...line,
                  postponedAt: null,
                  postponementReasonNo: null,
                  postponementComment: '',
                  availableFrom: null
                }
              : line
          )
        },
        request,
        'retried',
        pointNo
      )
      return ok({ status: statusOf(db, db.transportOrders.findOrFail(order.no)) })
    }
  )

  lineAction('declare', (_order, line, request) => {
    if (lineOutOfTour(line) || line.refusalAt || line.declaredAt) {
      throw conflict(PLANNING_MESSAGES.executionLineSettled)
    }
    const body = readBody(request)
    const received = readNumber(body, 'receivedQuantity', { required: true, min: 0 }) ?? 0
    const justification = readString(body, 'justification')
    const loaded = line.loadedQuantity ?? line.quantity
    const point = db.deliveryPoints.findOrFail(line.deliveryPointNo)
    const applicable = applicableTolerance(
      db.quantityTolerances.all(),
      point.customerNo,
      line.productNo
    )
    const decision = receivedQuantityDecision(
      loaded,
      received,
      applicable?.rule ?? null,
      planningSettings(db).quantities.overToleranceMode,
      justification
    )
    if (decision.blocked) throw unprocessable(PLANNING_MESSAGES.executionGapBlocked)
    return {
      ...line,
      declaredAt: nowIsoDateTime(),
      declaredBy: sessionUser(request).code,
      receivedQuantity: received,
      quantityGap: decision.gap,
      gapComment: decision.outside ? justification : '',
      gapQualification: null
    }
  })

  lineAction('refuse', (_order, line, request) => {
    if (line.declaredAt || line.refusalAt || lineOutOfTour(line)) {
      throw conflict(PLANNING_MESSAGES.executionLineSettled)
    }
    const reason = readReason(db, readBody(request), 'delivery_refusal')
    return {
      ...line,
      refusalAt: nowIsoDateTime(),
      refusalReasonNo: reason.reasonNo,
      refusalComment: reason.comment,
      refusalBy: 'driver'
    }
  })

  lineAction('postpone', (_order, line, request) => {
    if (line.declaredAt || line.refusalAt || lineOutOfTour(line)) {
      throw conflict(PLANNING_MESSAGES.executionLineSettled)
    }
    const body = readBody(request)
    const reason = readReason(db, body, 'postponement')
    const withReturn = body.withReturn === true
    return {
      ...line,
      postponedAt: nowIsoDateTime(),
      postponementReasonNo: reason.reasonNo,
      postponementComment: reason.comment,
      returnedAt: withReturn ? nowIsoDateTime() : null,
      availableFrom: readDate(body, 'availableFrom')
    }
  })

  lineAction('qualify', (_order, line, request) => {
    if (line.quantityGap === null || line.quantityGap === 0) {
      throw conflict(PLANNING_MESSAGES.executionNoGap)
    }
    if (line.gapQualification) throw conflict(PLANNING_MESSAGES.executionGapQualified)
    const body = readBody(request)
    const kind = readString(body, 'kind', { required: true })
    if (kind !== 'gain' && kind !== 'loss') throw unprocessable(PLANNING_MESSAGES.executionGapKind)
    const comment = readString(body, 'comment', { required: true })
    if (!qualificationFits(line.quantityGap, kind as GapQualification)) {
      throw unprocessable(PLANNING_MESSAGES.executionGapKind)
    }
    // The delivery manager says whether the gap is the driver's doing (TRS03-US17).
    if (typeof body.imputableToDriver !== 'boolean') throw invalidField('imputableToDriver')
    return {
      ...line,
      gapQualification: kind,
      gapComment: comment,
      gapImputableToDriver: body.imputableToDriver
    }
  })
}
