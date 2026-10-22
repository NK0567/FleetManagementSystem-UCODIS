// Calendar days are handled in local time: toISOString() is UTC and shifts the day near midnight.

const DAY_MS = 86_400_000
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}/

export function isIsoDay(value: unknown): value is string {
  return typeof value === 'string' && ISO_DAY_PATTERN.test(value)
}

export function parseIsoDay(iso: string): Date {
  return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
}

export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDay(now)
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDay(iso)
  date.setDate(date.getDate() + days)
  return toIsoDay(date)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDay(toIso).getTime() - parseIsoDay(fromIso).getTime()) / DAY_MS)
}

/** Moves the calendar day of an ISO date or date-time, keeping any time part unchanged. */
export function shiftIsoDate(value: string, days: number): string {
  if (!days || !isIsoDay(value)) return value
  return addDays(value, days) + value.slice(10)
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(iso: string): number {
  const day = parseIsoDay(iso).getDay()
  return day === 0 ? 7 : day
}

export function startOfIsoWeek(iso: string): string {
  return addDays(iso, 1 - isoWeekday(iso))
}
