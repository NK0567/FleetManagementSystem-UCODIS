import { currentLocale } from '@/core/i18n'
import { isIsoDay, parseIsoDay } from '@/utils/date'

export const EMPTY_CELL = '—'

const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/

function intlLocale(): string {
  return currentLocale() === 'en' ? 'en-GB' : 'fr-FR'
}

/** Calendar day in the active language; ISO date-times keep their local day. */
export function formatDate(value: string | null | undefined): string {
  if (!value || !isIsoDay(value)) return EMPTY_CELL
  const date = DATE_TIME_PATTERN.test(value) ? new Date(value) : parseIsoDay(value)
  return Number.isNaN(date.getTime()) ? EMPTY_CELL : date.toLocaleDateString(intlLocale())
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value || !DATE_TIME_PATTERN.test(value)) return formatDate(value)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY_CELL
  return date.toLocaleString(intlLocale(), { dateStyle: 'short', timeStyle: 'short' })
}

export function formatNumber(value: number | null | undefined, fractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return EMPTY_CELL
  return value.toLocaleString(intlLocale(), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })
}

export function isIsoDateValue(value: unknown): value is string {
  return typeof value === 'string' && isIsoDay(value) && /^\d{4}-\d{2}-\d{2}($|[T ])/.test(value)
}

/** Weekday name from an ISO weekday (1 = Monday … 7 = Sunday). */
export function formatWeekday(isoWeekday: number): string {
  // 2024-01-01 was a Monday.
  const date = new Date(Date.UTC(2024, 0, isoWeekday))
  return date.toLocaleDateString(intlLocale(), { weekday: 'long', timeZone: 'UTC' })
}

/** Duration in minutes as "8 h" or "7 h 30". */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`
}
