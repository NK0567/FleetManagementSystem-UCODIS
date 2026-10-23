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
