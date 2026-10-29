import { distanceToRouteM, positionOnTrip } from '@/modules/fleet/live-map/domain/livePosition'
import { plannedDurationMin } from '@/modules/fleet/route-templates/domain/routeTemplate'
import { addMinutes, minutesBetween } from '@/utils/date'
import { circleContaining, type GeoPoint } from '@/utils/geo'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { DeviationTypeRow } from '../../fixtures/fleet/deviationTypes'
import type { RouteDeviationRow } from '../../fixtures/fleet/routeDeviations'
import type { TripRow } from '../../fixtures/fleet/trips'
import { sitesApi } from './sites'
import { tripTrack } from './tripTracking'

/** The deviation types the system watches by itself (FLT04-US02). */
export const DETECTED_TYPES = [
  'MISSED-STOP',
  'STOP-ORDER',
  'TRIP-TIME',
  'UNPLANNED-STOP',
  'REST-PLACE',
  'OFF-ROUTE'
] as const
export type DetectedType = (typeof DETECTED_TYPES)[number]

/** The telematics reading of a vehicle standing still, with its duration in minutes. */
const LONG_STOP_EVENT = 'LONG-STOP'

/** Who records what the system found on its own. */
const SYSTEM_USER = 'SYSTEM'

export interface DetectedDeviation {
  tripNo: string
  deviationTypeNo: DetectedType
  detectedAt: string
  measure: number | null
  location: string
  latitude: number | null
  longitude: number | null
}

const positionLabel = (point: GeoPoint) =>
  `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`

/**
 * What a trip shows against its planned course, from its passages, its long stops and its
 * positions. Only the active types set to be detected are looked at, with their own threshold.
 */
export function tripDeviations(
  db: MockDatabase,
  trip: TripRow,
  now: string,
  types: ReadonlyMap<string, DeviationTypeRow>
): DetectedDeviation[] {
  const found: DetectedDeviation[] = []
  const watched = (no: DetectedType) => {
    const type = types.get(no)
    return type && type.active && type.autoDetected ? type : null
  }
  const { stops, arrivals } = tripTrack(db, trip)
  const add = (
    deviationTypeNo: DetectedType,
    detectedAt: string,
    fields: Partial<Omit<DetectedDeviation, 'tripNo' | 'deviationTypeNo' | 'detectedAt'>> = {}
  ) =>
    found.push({
      tripNo: trip.no,
      deviationTypeNo,
      detectedAt,
      measure: null,
      location: '',
      latitude: null,
      longitude: null,
      ...fields
    })

  // A stop left behind once a later one is reached: the point was missed.
  if (watched('MISSED-STOP')) {
    stops.forEach((stop, index) => {
      if (stop.passedAt) return
      const later = stops.slice(index + 1).find((next) => next.passedAt)
      if (later?.passedAt) {
        add('MISSED-STOP', later.passedAt, {
          location: stop.siteName,
          latitude: stop.latitude,
          longitude: stop.longitude
        })
      }
    })
  }

  // A stop reached before one planned ahead of it: the order was not kept.
  if (watched('STOP-ORDER')) {
    stops.forEach((stop, index) => {
      if (!stop.passedAt) return
      const earlier = stops
        .slice(0, index)
        .find((previous) => previous.passedAt && previous.passedAt > (stop.passedAt as string))
      if (earlier?.passedAt) {
        add('STOP-ORDER', earlier.passedAt, {
          location: `${stop.siteName} · ${earlier.siteName}`,
          latitude: earlier.latitude,
          longitude: earlier.longitude
        })
      }
    })
  }

  // The trip runs longer than planned by more than the threshold.
  const tripTime = watched('TRIP-TIME')
  if (tripTime && trip.actualDeparture) {
    const plannedMin = plannedDurationMin(trip.stops)
    const end = trip.status === 'in_progress' ? now : (trip.actualArrival ?? now)
    const excess = minutesBetween(trip.actualDeparture, end) - plannedMin
    const threshold = tripTime.threshold ?? 0
    if (excess > threshold) {
      add('TRIP-TIME', addMinutes(trip.actualDeparture, plannedMin + threshold), {
        measure: excess
      })
    }
  }

  // Long stops: a rest beyond its threshold must be taken where rest is allowed; a shorter
  // stop beyond its own threshold must be at a stop of the trip or at a rest place.
  const unplanned = watched('UNPLANNED-STOP')
  const rest = watched('REST-PLACE')
  if (unplanned || rest) {
    const types = new Map(db.siteTypes.all().map((type) => [type.no, type]))
    const areas = sitesApi(db)
      .filter((site) => site.active)
      .map((site) => ({ ...site, radiusM: site.effectiveRadiusM }))
    const tripSites = new Set(trip.stops.map((stop) => stop.siteNo))
    for (const event of db.telematicsEvents.all()) {
      if (event.tripNo !== trip.no || event.eventTypeNo !== LONG_STOP_EVENT) continue
      if (event.value === null || event.latitude === null || event.longitude === null) continue
      const point = { latitude: event.latitude, longitude: event.longitude }
      const site = circleContaining(point, areas)
      const siteType = site ? types.get(site.siteTypeNo) : undefined
      const restPlace = !!siteType?.restAllowed && !siteType.restricted
      const authorized = !!site && !siteType?.restricted && (tripSites.has(site.no) || restPlace)
      const fields = {
        measure: event.value,
        location: site?.name ?? positionLabel(point),
        ...point
      }
      if (rest && event.value >= (rest.threshold ?? 0)) {
        if (!restPlace) add('REST-PLACE', event.occurredAt, fields)
      } else if (unplanned && event.value >= (unplanned.threshold ?? 0) && !authorized) {
        add('UNPLANNED-STOP', event.occurredAt, fields)
      }
    }
  }

  // A position farther from the road than the corridor allows: the readings of the units on
  // the trip, and the position of the vehicle now while it drives.
  const corridor = watched('OFF-ROUTE')
  if (corridor && stops.length > 1) {
    /* The corridor validated on the trip plan of the transport order wins over the type's own
     * threshold (TRS01-US11 CA02). */
    const planned = db.transportOrders
      .all()
      .find(
        (order) => order.tripNo === trip.no && !!order.routePlanValidatedAt && !!order.corridorKm
      )
    const threshold = planned?.corridorKm ? planned.corridorKm * 1000 : (corridor.threshold ?? 0)
    const readings: { at: string; point: GeoPoint }[] = db.telematicsEvents
      .all()
      .filter(
        (event) => event.tripNo === trip.no && event.latitude !== null && event.longitude !== null
      )
      .map((event) => ({
        at: event.occurredAt,
        point: { latitude: event.latitude as number, longitude: event.longitude as number }
      }))
    if (trip.status === 'in_progress') {
      const fix = positionOnTrip(stops, arrivals, now)
      readings.push({ at: now, point: { latitude: fix.latitude, longitude: fix.longitude } })
    }
    const away = readings
      .map((reading) => ({ ...reading, gapM: distanceToRouteM(reading.point, stops) ?? 0 }))
      .filter((reading) => reading.gapM > threshold)
      .sort((a, b) => a.at.localeCompare(b.at))[0]
    // One exit per trip: the first reading outside the corridor.
    if (away) {
      add('OFF-ROUTE', away.at, {
        measure: away.gapM,
        location: positionLabel(away.point),
        ...away.point
      })
    }
  }
  return found
}

/** Trips that can still receive a deviation: on the road or arrived, not yet closed. */
const WATCHED_TRIPS = new Set(['in_progress', 'completed'])

const sameDeviation = (row: RouteDeviationRow, found: DetectedDeviation) =>
  row.tripNo === found.tripNo &&
  row.deviationTypeNo === found.deviationTypeNo &&
  (found.deviationTypeNo === 'TRIP-TIME' ||
    found.deviationTypeNo === 'OFF-ROUTE' ||
    (row.detectedAt === found.detectedAt && row.location === found.location))

/**
 * Records the deviations found on the trips and not recorded yet. Each one starts « to qualify »:
 * the system states a fact, it presumes no intent. Returns the numbers created.
 */
export function detectRouteDeviations(db: MockDatabase, now: string): string[] {
  const types = new Map(db.deviationTypes.all().map((type) => [type.no, type]))
  const created: string[] = []
  const stamp = nowIso()
  for (const trip of db.trips.all().filter((row) => WATCHED_TRIPS.has(row.status))) {
    for (const found of tripDeviations(db, trip, now, types)) {
      const existing = db.routeDeviations.all()
      if (existing.some((row) => sameDeviation(row, found))) continue
      const type = types.get(found.deviationTypeNo) as DeviationTypeRow
      const no = nextNo(
        existing.map((row) => row.no),
        'ECA-',
        5
      )
      db.routeDeviations.insert({
        no,
        ...found,
        severity: type.severity,
        source: 'telematics',
        endedAt: null,
        justification: '',
        justifiedAt: null,
        justifiedBy: null,
        qualification: null,
        createdAt: stamp,
        createdBy: SYSTEM_USER,
        modifiedAt: stamp,
        modifiedBy: SYSTEM_USER
      })
      created.push(no)
    }
  }
  return created
}
