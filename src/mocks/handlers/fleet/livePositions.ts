import {
  distanceToRouteM,
  lastReport,
  liveSituation,
  positionOnTrip,
  recordedTrack,
  type TripFix
} from '@/modules/fleet/live-map/domain/livePosition'
import type {
  LivePositionApi,
  TrackHistoryApi,
  VehicleJournalApi,
  VehicleJournalEntry
} from '@/modules/fleet/live-map/types/liveMap.types'
import { addMinutes, minutesBetween, nowIsoDateTime } from '@/utils/date'
import { circleContaining, type GeoPoint } from '@/utils/geo'
import type { MockDatabase } from '../../db/database'
import { DEAD_ZONES } from '../../fixtures/fleet/deadZones'
import { routeParam } from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import { readDateTime } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { alertsApi } from './alerts'
import { detectRouteDeviations } from './deviationDetection'
import { activeLinks, employeeNames } from './links'
import { routeDeviationsApi } from './routeDeviations'
import { fleetSettings } from './settings'
import { sitesApi } from './sites'
import { SUPERVISION_MESSAGES } from './supervisionMessages'
import { onboardReader, onboardReadings } from './onboardReadings'
import { telematicsEventsApi } from './telematicsEvents'
import { tripSpan, tripTrack, type TripTrackStop } from './tripTracking'
import { vehicleStatuses } from './vehicleState'

/** Units that locate the vehicle; a vehicle without one in working order is not on the map. */
const LOCATING_EQUIPMENT = new Set(['GPS', 'OBC'])

/** Alerts that concern a vehicle on the road and keep it « in alert » until they are handled. */
const ROAD_ALERT_CATEGORIES = new Set(['deviation', 'telematics'])

/** Corridor width when the « exit of the corridor » type sets none. */
const DEFAULT_CORRIDOR_M = 3_000

/** Longest period a history or a journal is read over. */
const MAX_HISTORY_DAYS = 31

/**
 * The demonstration has no real GPS: « simulate a movement » runs a clock ahead of the real
 * one, a few minutes at each refresh, so the vehicles on the road move along their route.
 * Kept in memory only; reloading the application starts again from the real time.
 */
const simulation = { active: false, offsetMin: 0 }
const SIMULATION_STEP_MIN = 10

export const simulatedNow = () =>
  simulation.offsetMin ? addMinutes(nowIsoDateTime(), simulation.offsetMin) : nowIsoDateTime()

/** Width of the corridor around the road, from the « exit of the corridor » deviation type. */
export function corridorWidthM(db: MockDatabase): number {
  return db.deviationTypes.find('OFF-ROUTE')?.threshold ?? DEFAULT_CORRIDOR_M
}

/** Vehicles with an alert of the road not handled yet, with how many. */
function roadAlertsByVehicle(db: MockDatabase, request: MockRequest): Map<string, number> {
  const tripVehicles = new Map(db.trips.all().map((trip) => [trip.no, trip.vehicleNo]))
  const deviationVehicles = new Map(
    db.routeDeviations.all().map((row) => [row.no, tripVehicles.get(row.tripNo) ?? ''])
  )
  const eventVehicles = new Map(db.telematicsEvents.all().map((row) => [row.no, row.vehicleNo]))
  const counts = new Map<string, number>()
  for (const alert of alertsApi(db, request)) {
    if (!ROAD_ALERT_CATEGORIES.has(alert.category)) continue
    if (alert.status !== 'new' && alert.status !== 'acknowledged') continue
    const vehicleNo =
      alert.category === 'deviation'
        ? deviationVehicles.get(alert.recordNo)
        : eventVehicles.get(alert.recordNo)
    if (vehicleNo) counts.set(vehicleNo, (counts.get(vehicleNo) ?? 0) + 1)
  }
  return counts
}

/**
 * Where each tracked vehicle is now. Nothing is stored: the position follows from the trip on the
 * road and the clock, so the map tells the same story as the trip records.
 */
export function livePositions(db: MockDatabase, request?: MockRequest): LivePositionApi[] {
  const now = simulatedNow()
  const signalLossMin = fleetSettings(db).telematics.signalLossMin
  const corridorM = corridorWidthM(db)
  const statuses = vehicleStatuses(db)
  const links = activeLinks(db)
  const names = employeeNames(db)
  const alerts = request ? roadAlertsByVehicle(db, request) : new Map<string, number>()
  const sites = new Map(db.sites.all().map((site) => [site.no, site]))
  const areas = sitesApi(db)
    .filter((site) => site.active)
    .map((site) => ({ ...site, radiusM: site.effectiveRadiusM }))
  // A vehicle off a trip is in its zone inside a site, unless the site is a restricted one.
  const restricted = new Set(
    db.siteTypes
      .all()
      .filter((type) => type.restricted)
      .map((type) => type.no)
  )
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route.name]))
  const onTheRoad = db.trips.all().filter((trip) => trip.status === 'in_progress')
  const tracked = new Set(
    db.vehicleEquipment
      .all()
      .filter(
        (item) => LOCATING_EQUIPMENT.has(item.equipmentTypeNo) && item.state === 'operational'
      )
      .map((item) => item.vehicleNo)
  )

  return db.vehicles
    .all()
    .filter((vehicle) => tracked.has(vehicle.no) && !vehicle.removal)
    .map((vehicle) => {
      const trip = onTheRoad.find((row) => row.vehicleNo === vehicle.no)
      const status = statuses.get(vehicle.no)?.status
      const home = sites.get(vehicle.homeSiteNo)
      let stops: TripTrackStop[] = []
      let arrivals: string[] = []
      let track: (at: string) => GeoPoint = () => ({
        latitude: home?.latitude ?? 0,
        longitude: home?.longitude ?? 0
      })
      let fix: TripFix | null = null
      if (trip) {
        ;({ stops, arrivals } = tripTrack(db, trip))
        track = (at) => positionOnTrip(stops, arrivals, at)
        fix = positionOnTrip(stops, arrivals, now)
      }
      const report = lastReport(track, now, DEAD_ZONES)
      const signalLost = minutesBetween(report.at, now) >= signalLossMin
      // The engine and the gauge as the unit read them when it last reported.
      const onboard = onboardReader(db, vehicle, trip)(report.at)
      const immobilized =
        status === 'in_maintenance' || status === 'immobilized' || status === 'out_of_service'
      const next = fix?.nextStop != null ? stops[fix.nextStop] : undefined
      const lastStop = stops.at(-1)
      const driverNo = trip?.driverNo ?? links.assignmentByVehicle.get(vehicle.no)?.employeeNo
      const place = circleContaining(report.position, areas)
      // On a trip, the zone is the corridor of its road; off a trip, the area of a site.
      const corridorGapM = trip ? distanceToRouteM(report.position, stops) : null
      const outOfZone = trip
        ? (corridorGapM ?? 0) > corridorM
        : !place || restricted.has(place.siteTypeNo)
      return {
        vehicleNo: vehicle.no,
        plate: vehicle.plate,
        make: vehicle.make,
        model: vehicle.model,
        driverName: driverNo ? (names.get(driverNo) ?? driverNo) : '',
        tripNo: trip?.no ?? null,
        routeName: trip ? (routes.get(trip.routeTemplateNo) ?? '') : '',
        situation: liveSituation({
          immobilized,
          signalLost,
          onTrip: !!trip,
          moving: !!fix && fix.speedKmh > 0,
          engineOn: !immobilized && onboard.engineOn
        }),
        engineOn: !immobilized && onboard.engineOn,
        fuelLevelPct: onboard.fuelLevelPct,
        ...report.position,
        speedKmh: signalLost ? 0 : (fix?.speedKmh ?? 0),
        reportedAt: report.at,
        placeNo: place?.no ?? null,
        placeName: place?.name ?? '',
        nextStopName: next?.siteName ?? '',
        nextStopExpectedAt: fix?.nextStop != null ? (arrivals[fix.nextStop] ?? null) : null,
        delayMin:
          lastStop && arrivals.length
            ? minutesBetween(lastStop.plannedAt, arrivals.at(-1) as string)
            : null,
        alertCount: alerts.get(vehicle.no) ?? 0,
        outOfZone,
        corridorGapM,
        stops: stops.map((stop, index) => ({
          siteName: stop.siteName,
          latitude: stop.latitude,
          longitude: stop.longitude,
          plannedAt: stop.plannedAt,
          expectedAt: arrivals[index] ?? stop.plannedAt,
          passed: !!stop.passedAt
        }))
      }
    })
}

/** The period asked for a history or a journal: both ends, the first before the second. */
function readPeriod(request: MockRequest): { from: string; to: string } {
  const query = request.query as Record<string, unknown>
  const from = readDateTime(query, 'from', { required: true }) ?? ''
  const to = readDateTime(query, 'to', { required: true }) ?? ''
  if (from > to) throw unprocessable(SUPERVISION_MESSAGES.periodInvalid)
  if (minutesBetween(from, to) > MAX_HISTORY_DAYS * 24 * 60) {
    throw unprocessable(SUPERVISION_MESSAGES.periodTooLong, { days: MAX_HISTORY_DAYS })
  }
  return { from, to }
}

/**
 * What the units of a vehicle reported over a period: telematics events (stops, behaviour,
 * faults, signal, sites) and the deviations found on its trips, newest first.
 */
export function vehicleJournal(
  db: MockDatabase,
  vehicleNo: string,
  from: string,
  to: string
): VehicleJournalApi {
  const vehicle = db.vehicles.findOrFail(vehicleNo)
  const within = (at: string) => at >= from && at <= to
  const trips = new Set(
    db.trips
      .all()
      .filter((trip) => trip.vehicleNo === vehicle.no)
      .map((trip) => trip.no)
  )
  const events: VehicleJournalEntry[] = telematicsEventsApi(db)
    .filter((event) => event.vehicleNo === vehicle.no && within(event.occurredAt))
    .map((event) => ({
      kind: 'telematics',
      no: event.no,
      at: event.occurredAt,
      family: event.family,
      typeName: event.eventTypeName,
      severity: event.severity,
      value: event.value,
      unit: event.unit,
      place: event.siteName,
      detail: event.detail,
      tripNo: event.tripNo,
      driverName: event.driverName,
      status: event.status
    }))
  const deviations: VehicleJournalEntry[] = routeDeviationsApi(db)
    .filter((deviation) => trips.has(deviation.tripNo) && within(deviation.detectedAt))
    .map((deviation) => ({
      kind: 'deviation',
      no: deviation.no,
      at: deviation.detectedAt,
      family: 'deviation',
      typeName: deviation.deviationTypeName,
      severity: deviation.severity,
      value: deviation.measure,
      unit: deviation.unit,
      place: deviation.location,
      detail: deviation.justification,
      tripNo: deviation.tripNo,
      driverName: deviation.driverName,
      status: deviation.nature
    }))
  return {
    vehicleNo: vehicle.no,
    from,
    to,
    entries: [...events, ...deviations].sort((a, b) => b.at.localeCompare(a.at))
  }
}

/** The positions recorded for a vehicle over a period, trip by trip, to replay them. */
export function trackHistory(
  db: MockDatabase,
  vehicleNo: string,
  from: string,
  to: string
): TrackHistoryApi {
  const vehicle = db.vehicles.findOrFail(vehicleNo)
  const now = simulatedNow()
  const end = to < now ? to : now
  const areas = sitesApi(db)
    .filter((site) => site.active)
    .map((site) => ({ ...site, radiusM: site.effectiveRadiusM }))
  const points: TrackHistoryApi['points'] = []
  const tripNos: string[] = []
  const trips = db.trips
    .all()
    .filter((trip) => trip.vehicleNo === vehicle.no)
    .sort((a, b) => (a.actualDeparture ?? '').localeCompare(b.actualDeparture ?? ''))
  for (const trip of trips) {
    const span = tripSpan(trip, now)
    if (!span || span.to < from || span.from > end) continue
    const { stops, arrivals } = tripTrack(db, trip)
    const start = span.from > from ? span.from : from
    const stop = span.to < end ? span.to : end
    const track = recordedTrack(stops, arrivals, start, stop, DEAD_ZONES)
    if (track.length) tripNos.push(trip.no)
    for (const point of track) {
      points.push({
        ...point,
        tripNo: trip.no,
        placeName: circleContaining(point, areas)?.name ?? ''
      })
    }
  }
  return {
    vehicleNo: vehicle.no,
    plate: vehicle.plate,
    from,
    to,
    tripNos,
    points,
    eventCount: vehicleJournal(db, vehicle.no, from, to).entries.length
  }
}

export function registerLivePositionsHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/fleet/live/positions', { feature: 'LIVEMAP', action: 'read' }, (request) => {
    if (simulation.active) simulation.offsetMin += SIMULATION_STEP_MIN
    // The control room watches the trips: what they show against their course is recorded.
    detectRouteDeviations(db, simulatedNow())
    return ok(livePositions(db, request))
  })

  router.get(
    '/fleet/live/history/:vehicleNo',
    { feature: 'LIVEMAP', action: 'read' },
    (request) => {
      const { from, to } = readPeriod(request)
      return ok(trackHistory(db, routeParam(request, 'vehicleNo'), from, to))
    }
  )

  router.get(
    '/fleet/telematics-journal/:vehicleNo',
    { feature: 'TELEMATICS', action: 'read' },
    (request) => {
      const { from, to } = readPeriod(request)
      detectRouteDeviations(db, simulatedNow())
      return ok(vehicleJournal(db, routeParam(request, 'vehicleNo'), from, to))
    }
  )

  router.get(
    '/fleet/telematics-readings/:vehicleNo',
    { feature: 'TELEMATICS', action: 'read' },
    (request) => {
      const vehicle = db.vehicles.findOrFail(routeParam(request, 'vehicleNo'))
      const position = livePositions(db).find((row) => row.vehicleNo === vehicle.no)
      const trip = db.trips
        .all()
        .find((row) => row.status === 'in_progress' && row.vehicleNo === vehicle.no)
      return ok(
        onboardReadings(
          db,
          vehicle,
          trip,
          position?.reportedAt ?? null,
          position?.situation === 'signal_lost'
        )
      )
    }
  )

  router.get('/fleet/live/simulation', { feature: 'LIVEMAP', action: 'read' }, () =>
    ok({ ...simulation })
  )

  router.post('/fleet/live/simulation', { feature: 'LIVEMAP', action: 'read' }, (request) => {
    const body = (request.body ?? {}) as Record<string, unknown>
    if (body.reset === true) {
      simulation.active = false
      simulation.offsetMin = 0
    } else {
      simulation.active = body.active === true
    }
    return ok({ ...simulation })
  })
}
