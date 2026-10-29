import { driverIneligibility } from '@/modules/fleet/drivers/domain/driver'
import { plannedSchedule } from '@/modules/fleet/route-templates/domain/routeTemplate'
import {
  canApply,
  kmGapPercent,
  nextStopIndex,
  type TripAction
} from '@/modules/fleet/trips/domain/trip'
import type { TripApi } from '@/modules/fleet/trips/types/trip.types'
import { minutesBetween, nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TripRow } from '../../fixtures/fleet/trips'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDateTime, readNumber, readString } from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import type { MockLanguage } from '../../i18n'
import { assertUsable } from './couplings'
import { createAvailability, unavailabilityError, unavailabilityText } from './availability'
import { driverFacts, ineligibilityText } from './drivers'
import { employeeNames, vehiclePlates } from './links'
import { FLEET_MESSAGES } from './messages'
import { plannedArrival } from './tripIndex'
import { tripAuthorization } from './departureAuthorizations'
import { deviationsToQualify } from './routeDeviations'
import { disabledFeatures } from '../../auth/permissions'

const BASE_PATH = '/fleet/trips'

/** With the departures module turned off, trips leave without an authorization. */
function authorizationRequired(db: MockDatabase): boolean {
  return !disabledFeatures(db.moduleToggles.all()).has('DEPARTUREAUTHORIZATION')
}

export function tripsApi(db: MockDatabase): TripApi[] {
  const required = authorizationRequired(db)
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route.name]))
  const sites = new Map(db.sites.all().map((site) => [site.no, site]))
  const plates = vehiclePlates(db)
  const names = employeeNames(db)
  return db.trips.all().map((trip) => {
    const schedule = plannedSchedule(trip.plannedDeparture, trip.stops)
    const stops = trip.stops.map((stop, index) => {
      const site = sites.get(stop.siteNo)
      return {
        siteNo: stop.siteNo,
        siteName: site?.name ?? stop.siteNo,
        role: stop.role,
        latitude: site?.latitude ?? 0,
        longitude: site?.longitude ?? 0,
        plannedAt: schedule[index] ?? trip.plannedDeparture,
        passedAt: stop.passedAt
      }
    })
    const arrival = plannedArrival(trip)
    const authorization = tripAuthorization(db, trip.no)
    const distanceKm =
      trip.startOdometerKm !== null && trip.endOdometerKm !== null
        ? trip.endOdometerKm - trip.startOdometerKm
        : null
    return {
      no: trip.no,
      routeTemplateNo: trip.routeTemplateNo,
      routeName: routes.get(trip.routeTemplateNo) ?? '',
      originName: stops[0]?.siteName ?? '',
      destinationName: stops.at(-1)?.siteName ?? '',
      vehicleNo: trip.vehicleNo,
      vehiclePlate: plates.get(trip.vehicleNo) ?? '',
      trailerNo: trip.trailerNo,
      trailerPlate: trip.trailerNo ? (plates.get(trip.trailerNo) ?? '') : '',
      driverNo: trip.driverNo,
      driverName: names.get(trip.driverNo) ?? '',
      plannedDeparture: trip.plannedDeparture,
      plannedArrival: arrival,
      actualDeparture: trip.actualDeparture,
      actualArrival: trip.actualArrival,
      startOdometerKm: trip.startOdometerKm,
      endOdometerKm: trip.endOdometerKm,
      referenceKm: trip.referenceKm,
      distanceKm,
      kmGapPercent: kmGapPercent(distanceKm, trip.referenceKm),
      arrivalDelayMin: trip.actualArrival ? minutesBetween(arrival, trip.actualArrival) : null,
      status: trip.status,
      cancelReason: trip.cancelReason,
      closedAt: trip.closedAt,
      closedBy: trip.closedBy,
      cancelledAt: trip.cancelledAt,
      cancelledBy: trip.cancelledBy,
      stops,
      stopCount: stops.length,
      passedStopCount: stops.filter((stop) => stop.passedAt !== null).length,
      deviationsToQualify: deviationsToQualify(db, trip.no),
      authorizationRequired: required,
      authorizationNo: authorization?.no ?? null,
      authorizationDecision: authorization?.decision ?? null,
      createdAt: trip.createdAt,
      createdBy: trip.createdBy,
      modifiedAt: trip.modifiedAt,
      modifiedBy: trip.modifiedBy
    }
  })
}

function readDeparture(input: Record<string, unknown>): string {
  const value = readDateTime(input, 'plannedDeparture', { required: true }) ?? ''
  if (value.slice(0, 10) < todayIso()) throw unprocessable(FLEET_MESSAGES.departureInPast)
  return value
}

type Plan = Pick<
  TripRow,
  'routeTemplateNo' | 'vehicleNo' | 'trailerNo' | 'driverNo' | 'plannedDeparture' | 'stops'
>

/**
 * Checks that the vehicle, the trailer and the driver can take the trip: fit for the road,
 * eligible over the whole trip, and not held by another open trip at the same time.
 */
function assertResourcesFree(
  db: MockDatabase,
  plan: Plan,
  language: MockLanguage,
  except?: string,
  allowBusy = false
): void {
  const availability = createAvailability(
    db,
    { start: plan.plannedDeparture, end: plannedArrival(plan) },
    language
  )
  const [first] = [
    ...availability.vehicleUnavailability(plan.vehicleNo, 'motorized', except),
    ...(plan.trailerNo ? availability.vehicleUnavailability(plan.trailerNo, 'towed', except) : []),
    ...availability.driverUnavailability(plan.driverNo, except)
  ].filter((item) => !allowBusy || item.code !== 'busy')
  if (first) throw unavailabilityError(language, first)
}

/** The overlaps of a plan with other open trips, read out: a warning the planner may override. */
export function overlapWarnings(
  db: MockDatabase,
  plan: Omit<TripPlan, 'routeTemplateNo'> & { routeTemplateNo: string },
  language: MockLanguage
): string[] {
  const route = db.routeTemplates.findOrFail(plan.routeTemplateNo)
  const full: Plan = { ...plan, stops: route.stops.map((stop) => ({ ...stop, passedAt: null })) }
  const availability = createAvailability(
    db,
    { start: full.plannedDeparture, end: plannedArrival(full) },
    language
  )
  return [
    ...availability.vehicleUnavailability(full.vehicleNo, 'motorized'),
    ...(full.trailerNo ? availability.vehicleUnavailability(full.trailerNo, 'towed') : []),
    ...availability.driverUnavailability(full.driverNo)
  ]
    .filter((item) => item.code === 'busy')
    .map((item) => unavailabilityText(language, item))
}

function assertAllowed(trip: TripRow, action: TripAction): void {
  if (!canApply(action, trip.status)) throw conflict(FLEET_MESSAGES.tripActionNotAllowed)
}

export interface TripPlan {
  routeTemplateNo: string
  vehicleNo: string
  trailerNo: string | null
  driverNo: string
  plannedDeparture: string
}

/** A new planned trip: the route's stops, its reference distance, and means free over the window. */
export function buildTrip(
  db: MockDatabase,
  plan: TripPlan,
  language: MockLanguage,
  options: { allowBusy?: boolean } = {}
): Omit<TripRow, 'createdAt' | 'createdBy' | 'modifiedAt' | 'modifiedBy'> {
  const route = db.routeTemplates.findOrFail(plan.routeTemplateNo)
  if (!route.active) throw unprocessable(FLEET_MESSAGES.inactiveRoute)
  if (plan.plannedDeparture.slice(0, 10) < todayIso()) {
    throw unprocessable(FLEET_MESSAGES.departureInPast)
  }
  const full: Plan = {
    ...plan,
    stops: route.stops.map((stop) => ({ ...stop, passedAt: null }))
  }
  assertResourcesFree(db, full, language, undefined, options.allowBusy)
  return {
    no: nextNo(
      db.trips.all().map((trip) => trip.no),
      'TRP-',
      5
    ),
    ...full,
    referenceKm: route.estimatedDistanceKm,
    actualDeparture: null,
    actualArrival: null,
    startOdometerKm: null,
    endOdometerKm: null,
    status: 'planned',
    cancelReason: '',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null
  }
}

export function registerTripsHandlers(router: MockRouter, db: MockDatabase): void {
  registerCrudResource(router, {
    basePath: BASE_PATH,
    feature: 'TRIP',
    collection: db.trips,
    list: () => tripsApi(db),
    searchColumns: ['no', 'vehiclePlate', 'driverName'],
    optionFields: { status: 'tripStatus' },
    create: (input, request) =>
      buildTrip(
        db,
        {
          routeTemplateNo: requireReference(db.routeTemplates, input, 'routeTemplateNo'),
          vehicleNo: requireReference(db.vehicles, input, 'vehicleNo'),
          trailerNo: optionalReference(db.vehicles, input, 'trailerNo'),
          driverNo: requireReference(db.employees, input, 'driverNo'),
          plannedDeparture: readDeparture(input)
        },
        request.language
      ),
    update: (existing, input, request) => {
      assertAllowed(existing, 'edit')
      const plan: Plan = {
        routeTemplateNo: existing.routeTemplateNo,
        vehicleNo:
          'vehicleNo' in input
            ? requireReference(db.vehicles, input, 'vehicleNo')
            : existing.vehicleNo,
        trailerNo:
          'trailerNo' in input
            ? optionalReference(db.vehicles, input, 'trailerNo')
            : existing.trailerNo,
        driverNo:
          'driverNo' in input
            ? requireReference(db.employees, input, 'driverNo')
            : existing.driverNo,
        plannedDeparture:
          'plannedDeparture' in input ? readDeparture(input) : existing.plannedDeparture,
        stops: existing.stops
      }
      assertResourcesFree(db, plan, request.language, existing.no)
      const { vehicleNo, trailerNo, driverNo, plannedDeparture } = plan
      return { vehicleNo, trailerNo, driverNo, plannedDeparture }
    }
  })

  const tripOf = (request: MockRequest) => db.trips.findOrFail(routeParam(request, 'no'))
  const respond = (no: string) => ok(tripsApi(db).find((trip) => trip.no === no))
  const action = (name: string, handler: (trip: TripRow, request: MockRequest) => void) =>
    router.post(`${BASE_PATH}/:no/${name}`, { feature: 'TRIP', action: 'execute' }, (request) => {
      const trip = tripOf(request)
      handler(trip, request)
      return respond(trip.no)
    })

  action('start', (trip, request) => {
    assertAllowed(trip, 'start')
    if (authorizationRequired(db) && tripAuthorization(db, trip.no)?.decision !== 'granted') {
      throw conflict(FLEET_MESSAGES.tripNeedsAuthorization)
    }
    const vehicle = db.vehicles.findOrFail(trip.vehicleNo)
    const others = db.trips
      .all()
      .filter((other) => other.no !== trip.no && other.status === 'in_progress')
    const busy = others.find(
      (other) =>
        other.vehicleNo === trip.vehicleNo ||
        (trip.trailerNo && other.trailerNo === trip.trailerNo) ||
        other.driverNo === trip.driverNo
    )
    if (busy) throw conflict(FLEET_MESSAGES.tripInProgress, { no: busy.no })
    assertUsable(db, vehicle, request.language)
    if (trip.trailerNo) assertUsable(db, db.vehicles.findOrFail(trip.trailerNo), request.language)
    const reasons = driverIneligibility(
      driverFacts(db, db.employees.findOrFail(trip.driverNo), todayIso())
    )
    if (reasons.length) {
      throw unprocessable(FLEET_MESSAGES.driverNotEligible, {
        reasons: ineligibilityText(request.language, reasons)
      })
    }
    const startKm =
      readNumber(readBody(request), 'startOdometerKm', { min: 0 }) ?? vehicle.odometerKm
    if (startKm < vehicle.odometerKm) {
      throw unprocessable(FLEET_MESSAGES.odometerBackwards, { km: vehicle.odometerKm })
    }
    const now = nowIsoDateTime()
    db.trips.update(trip.no, {
      status: 'in_progress',
      actualDeparture: now,
      startOdometerKm: startKm,
      stops: trip.stops.map((stop, index) => (index === 0 ? { ...stop, passedAt: now } : stop)),
      ...stampModified(request)
    })
  })

  action('pass-stop', (trip, request) => {
    assertAllowed(trip, 'passStop')
    const index = nextStopIndex(trip.stops)
    if (index === null) throw unprocessable(FLEET_MESSAGES.noStopToPass)
    const now = nowIsoDateTime()
    db.trips.update(trip.no, {
      stops: trip.stops.map((stop, position) =>
        position === index ? { ...stop, passedAt: now } : stop
      ),
      ...stampModified(request)
    })
  })

  action('complete', (trip, request) => {
    assertAllowed(trip, 'complete')
    const startKm = trip.startOdometerKm ?? 0
    const endKm = readNumber(readBody(request), 'endOdometerKm', { required: true, min: 0 }) ?? 0
    if (endKm < startKm) throw unprocessable(FLEET_MESSAGES.endOdometerBeforeStart, { km: startKm })
    const now = nowIsoDateTime()
    const last = trip.stops.length - 1
    db.trips.update(trip.no, {
      status: 'completed',
      actualArrival: now,
      endOdometerKm: endKm,
      stops: trip.stops.map((stop, index) => (index === last ? { ...stop, passedAt: now } : stop)),
      ...stampModified(request)
    })
    const vehicle = db.vehicles.findOrFail(trip.vehicleNo)
    if (endKm > vehicle.odometerKm) {
      db.vehicles.update(vehicle.no, {
        odometerKm: endKm,
        odometerReadings: [
          ...vehicle.odometerReadings,
          { readAt: now, km: endKm, source: 'trip', recordedBy: sessionUser(request).code }
        ]
      })
    }
  })

  action('close', (trip, request) => {
    assertAllowed(trip, 'close')
    const pending = deviationsToQualify(db, trip.no)
    if (pending) throw conflict(FLEET_MESSAGES.tripDeviationsToQualify, { count: pending })
    db.trips.update(trip.no, {
      status: 'closed',
      closedAt: nowIsoDateTime(),
      closedBy: sessionUser(request).code,
      ...stampModified(request)
    })
  })

  action('cancel', (trip, request) => {
    assertAllowed(trip, 'cancel')
    const reason = readString(readBody(request), 'reason')
    if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
    db.trips.update(trip.no, {
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: nowIsoDateTime(),
      cancelledBy: sessionUser(request).code,
      ...stampModified(request)
    })
  })
}
