import { applicableTolerance } from '@/modules/planning/quantity-tolerances/domain/quantityTolerance'
import {
  linesDelivered,
  qualificationFits,
  receivedQuantityDecision,
  type GapQualification
} from '@/modules/planning/execution/domain/execution'
import { lineOutOfTour, linesConfirmed } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { loadingReady } from '@/modules/planning/loading/domain/loading'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderLineRow, TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readNumber, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
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
    linesDelivered: linesDelivered(order.lines)
  })
}

function onTheRoad(db: MockDatabase, order: TransportOrderRow): boolean {
  const status = statusOf(db, order)
  return status === 'in_progress' || status === 'delivered'
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

export function registerExecutionHandlers(router: MockRouter, db: MockDatabase): void {
  router.post(
    '/planning/transport-orders/:no/depart',
    { feature: 'TRANSPORTORDER', action: 'execute' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (order.means !== 'carrier') throw conflict(PLANNING_MESSAGES.executionNotCarrier)
      if (statusOf(db, order) !== 'ready') throw conflict(PLANNING_MESSAGES.executionNotReady)
      save(db, order, { carrierDepartedAt: nowIsoDateTime() }, request, 'departed', order.no)
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

  const lineAction = (
    name: string,
    apply: (order: TransportOrderRow, line: TransportOrderLineRow, request: MockRequest) => TransportOrderLineRow
  ) =>
    router.post(
      `/planning/transport-orders/:no/lines/:lineNo/${name}`,
      { feature: 'TRANSPORTORDER', action: 'execute' },
      (request) => {
        const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
        if (!onTheRoad(db, order)) throw conflict(PLANNING_MESSAGES.executionNotOnTheRoad)
        const lineNo = Number(routeParam(request, 'lineNo'))
        const line = order.lines.find((item) => item.lineNo === lineNo)
        if (!line) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
        const next = apply(order, line, request)
        save(
          db,
          order,
          { lines: order.lines.map((item) => (item.lineNo === lineNo ? next : item)) },
          request,
          name === 'declare' ? 'declared' : name === 'refuse' ? 'refused' : name === 'qualify' ? 'qualified' : 'postponed',
          String(lineNo)
        )
        const updated = db.transportOrders.findOrFail(order.no)
        return ok({ status: statusOf(db, updated), delivered: linesDelivered(updated.lines) })
      }
    )

  lineAction('declare', (order, line, request) => {
    if (lineOutOfTour(line) || line.refusalAt || line.declaredAt) {
      throw conflict(PLANNING_MESSAGES.executionLineSettled)
    }
    const body = readBody(request)
    const received = readNumber(body, 'receivedQuantity', { required: true, min: 0 }) ?? 0
    const justification = readString(body, 'justification')
    const loaded = line.loadedQuantity ?? line.quantity
    const point = db.deliveryPoints.findOrFail(line.deliveryPointNo)
    const applicable = applicableTolerance(db.quantityTolerances.all(), point.customerNo, line.productNo)
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

  lineAction('refuse', (order, line, request) => {
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

  lineAction('postpone', (order, line, request) => {
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

  lineAction('qualify', (order, line, request) => {
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
