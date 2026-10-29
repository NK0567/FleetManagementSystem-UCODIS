import { applicableTolerance } from '@/modules/planning/quantity-tolerances/domain/quantityTolerance'
import {
  linesDelivered,
  qualificationFits,
  receivedQuantityDecision,
  type GapQualification
} from '@/modules/planning/execution/domain/execution'
import {
  lineOutOfTour,
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
import { readNumber, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { messageRecipients } from './recipientMessages'
import { planningSettings } from './settings'
import { readReason } from './planningReasons'

const TRIP_DEPARTED = ['in_progress', 'completed', 'closed']

function statusOf(db: MockDatabase, order: TransportOrderRow) {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const fleetDeparted = !!trip && TRIP_DEPARTED.includes(trip.status)
  return transportOrderStatus({
    cancelledAt: order.cancelledAt,
    means: order.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(order.lines),
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
  kind: 'departed' | 'declared' | 'refused' | 'postponed' | 'qualified',
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
      refusalComment: reason.comment
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
      returnedAt: withReturn ? nowIsoDateTime() : null
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
    return { ...line, gapQualification: kind, gapComment: comment }
  })
}
