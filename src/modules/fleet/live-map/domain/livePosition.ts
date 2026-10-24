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
}): LiveSituation {
  if (facts.signalLost) return 'signal_lost'
  if (facts.immobilized) return 'immobilized'
  if (!facts.onTrip) return 'parked'
  return facts.moving ? 'moving' : 'stopped'
}
