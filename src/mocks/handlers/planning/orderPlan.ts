import { isExpired } from '@/modules/planning/transport-orders/domain/transportOrder'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import { readDateTime, readNumber, readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { documentCompliance, gapsText, invalidatingGaps } from '../fleet/documentCompliance'
import { driverEmployees } from '../fleet/drivers'
import { toMockLanguage } from '../../i18n'
import { CIRCUIT_MESSAGES } from './circuitMessages'
import { PLANNING_MESSAGES } from './messages'
import { notifyDriver } from './notifications'
import { planningSettings } from './settings'
import { transportOrdersApi } from './transportOrders'

const BASE_PATH = '/planning/transport-orders'

function apiOf(db: MockDatabase, no: string) {
  const order = transportOrdersApi(db).find((item) => item.no === no)
  if (!order) throw notFound()
  return order
}

function event(
  request: MockRequest,
  kind: TransportOrderRow['events'][number]['kind'],
  detail = ''
) {
  return { at: nowIsoDateTime(), by: sessionUser(request).code, kind, detail }
}

/**
 * When the company blocks the orders past their date (TRS07-US07), an order that has not left
 * on its day cannot be loaded until it is rescheduled or cancelled. In alert mode it shows as
 * expired and the planner is told, but the loading goes on.
 */
export function assertLoadable(db: MockDatabase, order: TransportOrderRow): void {
  if (planningSettings(db).requests.expiredDateMode !== 'block') return
  const status = apiOf(db, order.no).status
  const departure = order.tripNo
    ? (db.trips.find(order.tripNo)?.plannedDeparture ?? order.plannedDeparture)
    : order.plannedDeparture
  if (isExpired(status, departure, todayIso())) {
    throw conflict(CIRCUIT_MESSAGES.expiredBlocked, { no: order.no })
  }
}

/** Absences, expired documents and couplings over a window, to choose the means (TRS01-US07). */
function meansNotes(db: MockDatabase, from: string, to: string, language: 'fr' | 'en') {
  const first = from.slice(0, 10)
  const last = to.slice(0, 10)
  const leaveTypes = new Map(db.leaveTypes.all().map((type) => [type.no, type.name]))
  const absences = driverEmployees(db).flatMap(
    (employee): { driverNo: string; reason: string; from: string | null; to: string | null }[] => {
      const leave = db.leaveRequests
        .all()
        .find(
          (row) =>
            row.employeeNo === employee.no &&
            row.status === 'approved' &&
            row.startDate <= last &&
            row.endDate >= first
        )
      if (leave) {
        return [
          {
            driverNo: employee.no,
            reason: leaveTypes.get(leave.leaveTypeNo) ?? leave.leaveTypeNo,
            from: leave.startDate,
            to: leave.endDate
          }
        ]
      }
      return employee.status === 'on_leave'
        ? [{ driverNo: employee.no, reason: '', from: null, to: null }]
        : []
    }
  )
  const compliance = documentCompliance(db).vehicles
  const expiredVehicles = [...compliance]
    .map(([vehicleNo, gaps]) => ({ vehicleNo, gaps: invalidatingGaps(gaps) }))
    .filter((item) => item.gaps.length)
    .map((item) => ({ vehicleNo: item.vehicleNo, documents: gapsText(db, item.gaps, language) }))
  const couplings = db.couplings
    .all()
    .filter((row) => row.startDate <= first && (!row.endDate || row.endDate >= first))
    .map((row) => ({ tractorNo: row.tractorNo, trailerNo: row.trailerNo }))
  return { absences, expiredVehicles, couplings }
}

export function registerOrderPlanHandlers(router: MockRouter, db: MockDatabase): void {
  router.get(
    `${BASE_PATH}/means-notes`,
    { feature: 'TRANSPORTORDER', action: 'read' },
    (request) => {
      const from = readDateTime(request.query, 'from', { required: true }) ?? ''
      const to = readDateTime(request.query, 'to') ?? from
      return ok(meansNotes(db, from, to, toMockLanguage(request.language)))
    }
  )

  /* The planner validates the trip plan of the order (TRS01-US11): its corridor is what the FMS
   * reads to detect a departure from the route. The mock records it on the order. */
  router.post(
    `${BASE_PATH}/:no/route-plan/validate`,
    { feature: 'TRANSPORTORDER', action: 'update' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      const status = apiOf(db, order.no).status
      if (['in_progress', 'completed', 'cancelled'].includes(status)) {
        throw conflict(PLANNING_MESSAGES.orderScheduleLocked)
      }
      const routeNo = order.tripNo
        ? (db.trips.find(order.tripNo)?.routeTemplateNo ?? order.routeTemplateNo)
        : order.routeTemplateNo
      if (!routeNo) throw unprocessable(PLANNING_MESSAGES.orderScheduleMissing)
      const corridorKm = readNumber(readBody(request), 'corridorKm', { min: 0.5, max: 50 }) ?? 5
      db.transportOrders.update(order.no, {
        routePlanValidatedAt: nowIsoDateTime(),
        corridorKm,
        events: [...order.events, event(request, 'route_validated', `${corridorKm} km`)],
        ...stampModified(request)
      })
      return ok(apiOf(db, order.no))
    }
  )

  /* On the road, the route may change with a reason (TRS01-US11): the driver is told, and the
   * route followed until then stays in the history of the order. */
  router.post(
    `${BASE_PATH}/:no/route-change`,
    { feature: 'TRANSPORTORDER', action: 'update' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (apiOf(db, order.no).status !== 'in_progress') {
        throw conflict(CIRCUIT_MESSAGES.routeChangeClosed)
      }
      const body = readBody(request)
      const reason = readString(body, 'reason')
      if (!reason) throw unprocessable(CIRCUIT_MESSAGES.routeChangeReason)
      const routeTemplateNo = requireReference(db.routeTemplates, body, 'routeTemplateNo')
      if (!db.routeTemplates.findOrFail(routeTemplateNo).active) {
        throw unprocessable(PLANNING_MESSAGES.orderRouteInactive)
      }
      const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
      const previous = trip?.routeTemplateNo ?? order.routeTemplateNo
      if (previous === routeTemplateNo) throw unprocessable(CIRCUIT_MESSAGES.routeChangeSame)
      const at = nowIsoDateTime()
      if (trip) {
        // The new route's stops; where the trip has already left from stays recorded.
        const route = db.routeTemplates.findOrFail(routeTemplateNo)
        db.trips.update(trip.no, {
          routeTemplateNo,
          referenceKm: route.estimatedDistanceKm,
          stops: route.stops.map((stop, index) => ({
            ...stop,
            passedAt: index === 0 ? (trip.stops[0]?.passedAt ?? null) : null
          })),
          ...stampModified(request)
        })
      }
      db.transportOrders.update(order.no, {
        routeTemplateNo,
        // The validated plan was drawn on the old route: the new one is to validate again.
        routePlanValidatedAt: null,
        routeHistory: [
          ...(order.routeHistory ?? []),
          { at, by: sessionUser(request).code, routeTemplateNo: previous, reason }
        ],
        events: [...order.events, event(request, 'route_changed', reason)],
        ...stampModified(request)
      })
      notifyDriver(
        db,
        trip?.driverNo,
        'order_route_changed',
        order.no,
        `${db.routeTemplates.find(routeTemplateNo)?.name ?? routeTemplateNo} : ${reason}`
      )
      return ok(apiOf(db, order.no))
    }
  )

  /* An order past its date is rescheduled (TRS07-US07): a new departure, the trip with it while
   * it has not left. */
  router.post(
    `${BASE_PATH}/:no/reschedule`,
    { feature: 'TRANSPORTORDER', action: 'update' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      const status = apiOf(db, order.no).status
      if (!['draft', 'planned', 'confirmed', 'ready'].includes(status)) {
        throw conflict(PLANNING_MESSAGES.orderScheduleLocked)
      }
      const departure = readDateTime(readBody(request), 'plannedDeparture', { required: true })!
      if (departure.slice(0, 10) < todayIso()) {
        throw unprocessable(PLANNING_MESSAGES.orderDepartureInPast)
      }
      const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
      if (trip && trip.status === 'planned') {
        db.trips.update(trip.no, { plannedDeparture: departure, ...stampModified(request) })
      }
      db.transportOrders.update(order.no, {
        plannedDeparture: departure,
        events: [...order.events, event(request, 'rescheduled', departure)],
        ...stampModified(request)
      })
      return ok(apiOf(db, order.no))
    }
  )
}
