import { addMinutes, minutesBetween } from '@/utils/date'
import {
  circleContaining,
  distanceKm,
  pointBetween,
  type GeoCircle,
  type GeoPoint
} from '@/utils/geo'

export const LIVE_SITUATIONS = [
  'moving',
  'idling',
  'stopped',
  'parked',
  'immobilized',
  'signal_lost'
] as const
export type LiveSituation = (typeof LIVE_SITUATIONS)[number]

export interface TrackedStop extends GeoPoint {
  plannedAt: string
  passedAt: string | null
  breakMin: number
}

/** The real arrival times behind the vehicle; ahead, the planned ones shifted by the delay taken so far. */
export function expectedArrivals(stops: readonly TrackedStop[]): string[] {
  let delayMin = 0
  return stops.map((stop) => {
    if (!stop.passedAt) return addMinutes(stop.plannedAt, delayMin)
    delayMin = minutesBetween(stop.plannedAt, stop.passedAt)
    return stop.passedAt
  })
}

export interface TripFix extends GeoPoint {
  /** The stop the vehicle stands at; null while it drives. */
  atStop: number | null
  /** The next stop to reach; null at the last one. */
  nextStop: number | null
  /** Average speed of the leg being driven. */
  speedKmh: number
}

/** Where the vehicle should be at a moment of its trip, given its arrival times. */
export function positionOnTrip(
  stops: readonly TrackedStop[],
  arrivals: readonly string[],
  at: string
): TripFix {
  const last = stops.length - 1
  for (let index = last; index >= 0; index--) {
    const stop = stops[index] as TrackedStop
    const arrival = arrivals[index] as string
    if (arrival > at) continue
    const leaves = addMinutes(arrival, stop.breakMin)
    const next = stops[index + 1]
    const nextArrival = arrivals[index + 1]
    if (!next || !nextArrival || at < leaves) {
      return {
        latitude: stop.latitude,
        longitude: stop.longitude,
        atStop: index,
        nextStop: next ? index + 1 : null,
        speedKmh: 0
      }
    }
    const legMin = Math.max(1, minutesBetween(leaves, nextArrival))
    return {
      ...pointBetween(stop, next, minutesBetween(leaves, at) / legMin),
      atStop: null,
      nextStop: index + 1,
      speedKmh: Math.round(distanceKm(stop, next) / (legMin / 60))
    }
  }
  const first = stops[0] as TrackedStop
  return {
    latitude: first.latitude,
    longitude: first.longitude,
    atStop: 0,
    nextStop: stops.length > 1 ? 1 : null,
    speedKmh: 0
  }
}

/** Furthest a unit is traced back to find the moment it went silent. */
const LOOK_BACK_MIN = 12 * 60

/**
 * A unit inside a dead zone cannot report: its last report is the minute before it entered the
 * zone, and it reports again as soon as it leaves.
 */
export function lastReport(
  track: (at: string) => GeoPoint,
  at: string,
  deadZones: readonly GeoCircle[]
): { at: string; position: GeoPoint } {
  const here = track(at)
  if (!circleContaining(here, deadZones)) return { at, position: here }
  for (let minutes = 1; minutes <= LOOK_BACK_MIN; minutes++) {
    const before = addMinutes(at, -minutes)
    const position = track(before)
    if (!circleContaining(position, deadZones)) return { at: before, position }
  }
  return { at, position: here }
}

export function liveSituation(facts: {
  immobilized: boolean
  signalLost: boolean
  onTrip: boolean
  moving: boolean
  /** The engine runs, as read by the on-board computer. */
  engineOn?: boolean
}): LiveSituation {
  if (facts.signalLost) return 'signal_lost'
  if (facts.immobilized) return 'immobilized'
  if (!facts.moving && facts.engineOn) return 'idling'
  if (!facts.onTrip) return 'parked'
  return facts.moving ? 'moving' : 'stopped'
}

/**
 * Whether the engine runs at a moment of the trip: always while the vehicle drives; at a stop,
 * only for the first minutes after it stopped, as long as the driver lets it run.
 */
export function engineRunning(
  stops: readonly TrackedStop[],
  arrivals: readonly string[],
  at: string,
  idleAtStopMin: number
): boolean {
  const fix = positionOnTrip(stops, arrivals, at)
  if (fix.speedKmh > 0) return true
  const arrival = fix.atStop !== null ? arrivals[fix.atStop] : undefined
  if (!arrival || arrival > at) return false
  return minutesBetween(arrival, at) < idleAtStopMin
}

/** Kilometres driven along the trip between two moments, measured every few minutes. */
export function distanceDrivenKm(
  stops: readonly TrackedStop[],
  arrivals: readonly string[],
  from: string,
  to: string,
  stepMin = 5
): number {
  if (!stops.length || from >= to) return 0
  let total = 0
  let previous: GeoPoint = positionOnTrip(stops, arrivals, from)
  for (let at = addMinutes(from, stepMin); ; at = addMinutes(at, stepMin)) {
    const moment = at < to ? at : to
    const here = positionOnTrip(stops, arrivals, moment)
    total += distanceKm(previous, here)
    previous = here
    if (moment === to) break
  }
  return total
}

const METRES_PER_DEGREE = 111_320

/**
 * Shortest distance from a point to the road drawn by the stops, in metres. A flat projection
 * around the point is precise enough at the scale of a corridor; null without a leg to measure.
 */
export function distanceToRouteM(point: GeoPoint, route: readonly GeoPoint[]): number | null {
  if (route.length < 2) return null
  const scaleX = Math.cos((point.latitude * Math.PI) / 180) * METRES_PER_DEGREE
  const project = (p: GeoPoint) => ({
    x: (p.longitude - point.longitude) * scaleX,
    y: (p.latitude - point.latitude) * METRES_PER_DEGREE
  })
  let best = Infinity
  for (let index = 1; index < route.length; index++) {
    const a = project(route[index - 1] as GeoPoint)
    const b = project(route[index] as GeoPoint)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = dx * dx + dy * dy
    const t = length ? Math.min(1, Math.max(0, -(a.x * dx + a.y * dy) / length)) : 0
    best = Math.min(best, Math.hypot(a.x + t * dx, a.y + t * dy))
  }
  return Math.round(best)
}

export interface TrackPoint extends GeoPoint {
  at: string
  speedKmh: number
}

/**
 * The positions a unit recorded over a stretch of its trip, one every few minutes; nothing is
 * recorded inside a dead zone, where the unit cannot report.
 */
export function recordedTrack(
  stops: readonly TrackedStop[],
  arrivals: readonly string[],
  from: string,
  to: string,
  deadZones: readonly GeoCircle[],
  stepMin = 10
): TrackPoint[] {
  const points: TrackPoint[] = []
  for (let at = from; at <= to; at = addMinutes(at, stepMin)) {
    const fix = positionOnTrip(stops, arrivals, at)
    const position = { latitude: fix.latitude, longitude: fix.longitude }
    if (circleContaining(position, deadZones)) continue
    points.push({ at, ...position, speedKmh: fix.speedKmh })
  }
  return points
}
