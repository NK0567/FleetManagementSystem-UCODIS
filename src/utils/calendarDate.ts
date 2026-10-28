/**
 * True when `ymd` is empty or a real calendar day in YYYY-MM-DD form.
 * Rejects impossible dates such as 2026-06-31 (JS Date would roll to July).
 */
export function isValidCalendarDateYmd(ymd: string | null | undefined): boolean {
  const trimmed = String(ymd ?? '').trim()
  if (!trimmed) return true
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export type DateInputReadResult = {
  value: string
  rejected: boolean
}

/**
 * Read a native `<input type="date">` value and reject invalid calendar dates
 * (including browser `badInput` for incomplete typed values like 31/06).
 */
export function readValidDateInput(input: HTMLInputElement): DateInputReadResult {
  if (input.validity.badInput) {
    return { value: '', rejected: true }
  }
  const value = String(input.value ?? '').trim()
  if (!value) {
    return { value: '', rejected: false }
  }
  if (!isValidCalendarDateYmd(value)) {
    return { value: '', rejected: true }
  }
  return { value, rejected: false }
}

/**
 * Apply calendar validation on input: clear the control and return '' when invalid.
 * Otherwise return the valid YYYY-MM-DD (optionally clamped to min/max).
 */
export function sanitizeDateInputValue(
  input: HTMLInputElement,
  options?: { min?: string; max?: string }
): string {
  const { value, rejected } = readValidDateInput(input)
  if (rejected) {
    input.value = ''
    return ''
  }
  if (!value) return ''

  let next = value
  const min = String(options?.min ?? '').trim()
  const max = String(options?.max ?? '').trim()
  if (min && isValidCalendarDateYmd(min) && next < min) next = min
  if (max && isValidCalendarDateYmd(max) && next > max) next = max
  if (next !== value) input.value = next
  return next
}
