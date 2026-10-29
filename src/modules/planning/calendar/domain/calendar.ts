/** A planned use of a vehicle or a driver over a time window. */
export interface CalendarBooking {
  key: string
  start: string
  end: string
}

/**
 * The bookings of one row that overlap another booking of the same row. An end time is only
 * theoretical: the overlap is shown, never refused here.
 */
export function overlappingKeys(bookings: readonly CalendarBooking[]): Set<string> {
  const sorted = [...bookings].sort((a, b) => a.start.localeCompare(b.start))
  const keys = new Set<string>()
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!
      const b = sorted[j]!
      if (b.start >= a.end) break
      keys.add(a.key)
      keys.add(b.key)
    }
  }
  return keys
}

/** The Monday of the week holding the given day (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  const shift = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - shift)
  return date.toISOString().slice(0, 10)
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
