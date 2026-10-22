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
