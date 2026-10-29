import { addMinutes, minutesBetween } from '@/utils/date'

/** The thresholds of the fleet settings that a trip is checked against. */
export interface DrivingTimeLimits {
  continuousDrivingMaxMin: number
  breakAfterDrivingMin: number
  dailyDrivingMaxMin: number
  weeklyDrivingMaxH: number
  /** HH:MM; both empty when night driving is allowed. */
  nightBanStart: string
  nightBanEnd: string
}

/** One leg of a trip, driven between two stops. */
export interface DrivingLeg {
  start: string
  end: string
  /** Time spent at the stop the leg ends at, before driving on. */
  breakAfterMin: number
}

export type DrivingBreachCode = 'continuous' | 'daily' | 'weekly' | 'night'

export interface DrivingBreach {
  code: DrivingBreachCode
  /** Minutes driven against the limit, or minutes driven at night. */
  drivenMin: number
  limitMin: number
  /** Day of the breach, for the daily and night limits. */
  day: string | null
}

export interface TripStopTimes {
  passedAt: string | null
  plannedIntervalMin: number
  breakMin: number
}

/**
 * The legs of a trip: from the passages at the stops when it has left, otherwise from its plan.
 * The time at a stop is its planned break; the rest of the time between two passages is driving.
 */
export function tripLegs(
  stops: readonly TripStopTimes[],
  plannedDeparture: string
): { legs: DrivingLeg[]; source: 'actual' | 'planned' } {
  const passed = stops.filter((stop) => stop.passedAt)
  if (passed.length >= 2) {
    const legs: DrivingLeg[] = []
    for (let index = 1; index < passed.length; index++) {
      const previous = passed[index - 1]!
      const start = addMinutes(previous.passedAt!, previous.breakMin)
      const end = passed[index]!.passedAt!
      if (end > start) legs.push({ start, end, breakAfterMin: passed[index]!.breakMin })
    }
    return { legs, source: 'actual' }
  }
  const legs: DrivingLeg[] = []
  let cursor = addMinutes(plannedDeparture, stops[0]?.breakMin ?? 0)
  for (const stop of stops.slice(1)) {
    const end = addMinutes(cursor, stop.plannedIntervalMin)
    legs.push({ start: cursor, end, breakAfterMin: stop.breakMin })
    cursor = addMinutes(end, stop.breakMin)
  }
  return { legs, source: 'planned' }
}

const minutesOfDay = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/** Minutes of a leg spent inside the night ban, which may run past midnight. */
function nightMinutes(leg: DrivingLeg, start: string, end: string): number {
  if (!start || !end) return 0
  const banStart = minutesOfDay(start)
  const banEnd = minutesOfDay(end)
  let total = 0
  for (let at = leg.start; at < leg.end; at = addMinutes(at, 15)) {
    const minute = minutesOfDay(at.slice(11, 16))
    const inside =
      banStart < banEnd
        ? minute >= banStart && minute < banEnd
        : minute >= banStart || minute < banEnd
    if (inside) total += Math.min(15, minutesBetween(at, leg.end))
  }
  return total
}

/**
 * What a trip breaks of the driving-time limits. Continuous driving runs until a break long
 * enough; daily driving adds the legs started that day; weekly driving adds `earlierWeekMin`, the
 * driving of the driver's other trips in the seven days before.
 */
export function drivingBreaches(
  legs: readonly DrivingLeg[],
  limits: DrivingTimeLimits,
  earlierWeekMin = 0
): DrivingBreach[] {
  const breaches: DrivingBreach[] = []
  let continuous = 0
  let worstContinuous = 0
  const daily = new Map<string, number>()
  const night = new Map<string, number>()
  for (const leg of legs) {
    const driven = minutesBetween(leg.start, leg.end)
    continuous += driven
    worstContinuous = Math.max(worstContinuous, continuous)
    if (leg.breakAfterMin >= limits.breakAfterDrivingMin) continuous = 0
    const day = leg.start.slice(0, 10)
    daily.set(day, (daily.get(day) ?? 0) + driven)
    const atNight = nightMinutes(leg, limits.nightBanStart, limits.nightBanEnd)
    if (atNight > 0) night.set(day, (night.get(day) ?? 0) + atNight)
  }
  if (worstContinuous > limits.continuousDrivingMaxMin) {
    breaches.push({
      code: 'continuous',
      drivenMin: worstContinuous,
      limitMin: limits.continuousDrivingMaxMin,
      day: null
    })
  }
  for (const [day, driven] of daily) {
    if (driven > limits.dailyDrivingMaxMin) {
      breaches.push({ code: 'daily', drivenMin: driven, limitMin: limits.dailyDrivingMaxMin, day })
    }
  }
  const total = legs.reduce((sum, leg) => sum + minutesBetween(leg.start, leg.end), 0)
  if (earlierWeekMin + total > limits.weeklyDrivingMaxH * 60) {
    breaches.push({
      code: 'weekly',
      drivenMin: earlierWeekMin + total,
      limitMin: limits.weeklyDrivingMaxH * 60,
      day: null
    })
  }
  for (const [day, driven] of night) {
    breaches.push({ code: 'night', drivenMin: driven, limitMin: 0, day })
  }
  return breaches
}

export function drivenMinutes(legs: readonly DrivingLeg[]): number {
  return legs.reduce((sum, leg) => sum + minutesBetween(leg.start, leg.end), 0)
}
