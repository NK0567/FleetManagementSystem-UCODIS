import { addMinutes } from '@/utils/date'

export const STOP_ROLES = ['departure', 'loading', 'rest', 'check', 'delivery', 'arrival'] as const
export type StopRole = (typeof STOP_ROLES)[number]

export interface RouteStop {
  siteNo: string
  role: StopRole
  /** Driving time from the previous stop. */
  plannedIntervalMin: number
  /** Time spent at the stop before leaving. */
  breakMin: number
}

export type RouteIssue =
  | 'tooFewStops'
  | 'firstMustBeDeparture'
  | 'missingSite'
  | 'negativeDuration'
  | 'sameSiteTwiceInARow'

/** What makes a list of stops unusable as a route; empty when it is valid. */
export function routeIssues(stops: readonly RouteStop[]): RouteIssue[] {
  const issues: RouteIssue[] = []
  if (stops.length < 2) issues.push('tooFewStops')
  if (stops[0] && stops[0].role !== 'departure') issues.push('firstMustBeDeparture')
  if (stops.some((stop) => !stop.siteNo)) issues.push('missingSite')
  if (stops.some((stop) => stop.plannedIntervalMin < 0 || stop.breakMin < 0)) {
    issues.push('negativeDuration')
  }
  if (stops.some((stop, index) => index > 0 && stop.siteNo === stops[index - 1]?.siteNo)) {
    issues.push('sameSiteTwiceInARow')
  }
  return issues
}

/** Planned arrival at each stop: the driving times, plus the breaks of the stops before. */
export function plannedSchedule(departure: string, stops: readonly RouteStop[]): string[] {
  let elapsed = 0
  return stops.map((stop, index) => {
    elapsed += index === 0 ? 0 : stop.plannedIntervalMin
    const plannedAt = addMinutes(departure, elapsed)
    elapsed += stop.breakMin
    return plannedAt
  })
}

/** Total planned duration, from leaving the first stop to reaching the last one. */
export function plannedDurationMin(stops: readonly RouteStop[]): number {
  return stops.reduce(
    (total, stop, index) =>
      total +
      (index === 0 ? 0 : stop.plannedIntervalMin) +
      (index < stops.length - 1 ? stop.breakMin : 0),
    0
  )
}

/**
 * The road is longer than the straight line between two stops. Without a routing service in the
 * mock, a leg is read as the great-circle distance times this factor (a simulation, shown as such).
 */
export const ROAD_FACTOR = 1.25

export interface RoutePoint {
  latitude: number
  longitude: number
}

/** Distance of the route, recomputed from its stops (TRS07-US03), in whole kilometres. */
export function routeDistanceKm(
  points: readonly RoutePoint[],
  distance: (a: RoutePoint, b: RoutePoint) => number
): number {
  let total = 0
  for (let index = 1; index < points.length; index++) {
    total += distance(points[index - 1]!, points[index]!) * ROAD_FACTOR
  }
  return Math.round(total)
}

/**
 * Reference time of the route (TRS07-US03): each leg driven at the average speed, plus the time
 * planned at the stops before the last one.
 */
export function referenceDurationMin(
  distanceKm: number,
  stops: readonly Pick<RouteStop, 'breakMin'>[],
  averageSpeedKmh: number
): number {
  const driving = averageSpeedKmh > 0 ? (distanceKm / averageSpeedKmh) * 60 : 0
  const stopped = stops.slice(0, -1).reduce((total, stop) => total + stop.breakMin, 0)
  return Math.round(driving + stopped)
}

/** Shortest distance from a point to a leg, in kilometres, on a flat local projection. */
export function distanceToLegKm(point: RoutePoint, a: RoutePoint, b: RoutePoint): number {
  const kmPerDegree = 111.32
  const cos = Math.cos((((a.latitude + b.latitude) / 2) * Math.PI) / 180)
  const project = (p: RoutePoint) => ({
    x: p.longitude * kmPerDegree * cos,
    y: p.latitude * kmPerDegree
  })
  const p = project(point)
  const start = project(a)
  const end = project(b)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = dx * dx + dy * dy
  const t = length
    ? Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / length))
    : 0
  return Math.hypot(p.x - (start.x + t * dx), p.y - (start.y + t * dy))
}
