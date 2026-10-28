import { addMinutes, minutesBetween } from '@/utils/date'

export const DEPARTURE_DECISIONS = ['pending', 'granted', 'refused'] as const
export type DepartureDecision = (typeof DEPARTURE_DECISIONS)[number]

export const DEPARTURE_CHECK_CODES = [
  'checklist',
  'vehicle',
  'trailer',
  'vehicleDocuments',
  'driver',
  'rest',
  'weeklyRest',
  'driverChecks'
] as const
export type DepartureCheckCode = (typeof DEPARTURE_CHECK_CODES)[number]

export interface DepartureCheck {
  code: DepartureCheckCode
  ok: boolean
  /** What failed, or what was found, in the language of the request. */
  detail: string
}

export function readyToLeave(checks: readonly DepartureCheck[]): boolean {
  return checks.every((check) => check.ok)
}

/** A stretch of work of the driver: a trip from its actual departure to its actual arrival. */
export interface WorkPeriod {
  start: string
  end: string
}

const hours = (from: string, to: string) => minutesBetween(from, to) / 60

/** Rest before the departure, since the end of the driver's last trip; none without a past trip. */
export function restBeforeHours(periods: readonly WorkPeriod[], departure: string): number | null {
  const last = periods
    .map((period) => period.end)
    .filter((end) => end <= departure)
    .sort()
    .at(-1)
  return last ? hours(last, departure) : null
}

/** The longest uninterrupted rest over the seven days before the departure. */
export function longestRestHours(periods: readonly WorkPeriod[], departure: string): number {
  const windowStart = addMinutes(departure, -7 * 24 * 60)
  const worked = periods
    .filter((period) => period.end > windowStart && period.start < departure)
    .sort((a, b) => a.start.localeCompare(b.start))
  let cursor = windowStart
  let longest = 0
  for (const period of worked) {
    if (period.start > cursor) longest = Math.max(longest, hours(cursor, period.start))
    if (period.end > cursor) cursor = period.end
  }
  return Math.max(longest, hours(cursor, departure))
}
