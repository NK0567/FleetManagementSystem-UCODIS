import { daysBetween, todayIso } from '@/utils/date'

/** Day around which every demo fixture was written. */
export const DEMO_REFERENCE_DATE = '2026-09-04'

/** Days to add to a fixture date so it keeps the same distance to today. */
export function demoDayOffset(now: Date = new Date()): number {
  return daysBetween(DEMO_REFERENCE_DATE, todayIso(now))
}

export function nowIso(): string {
  return new Date().toISOString()
}
