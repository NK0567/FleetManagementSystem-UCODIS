import { describe, expect, it } from 'vitest'
import { isValidCalendarDateYmd, readValidDateInput, sanitizeDateInputValue } from './calendarDate'

function fakeDateInput(value: string, badInput = false): HTMLInputElement {
  return {
    value,
    validity: { badInput }
  } as HTMLInputElement
}

describe('calendarDate', () => {
  it('accepts empty and real calendar days', () => {
    expect(isValidCalendarDateYmd('')).toBe(true)
    expect(isValidCalendarDateYmd('2026-06-30')).toBe(true)
    expect(isValidCalendarDateYmd('2024-02-29')).toBe(true)
  })

  it('rejects impossible calendar days', () => {
    expect(isValidCalendarDateYmd('2026-06-31')).toBe(false)
    expect(isValidCalendarDateYmd('2025-02-29')).toBe(false)
    expect(isValidCalendarDateYmd('2026-13-01')).toBe(false)
    expect(isValidCalendarDateYmd('31/06/2026')).toBe(false)
  })

  it('readValidDateInput rejects badInput and invalid ymd', () => {
    expect(readValidDateInput(fakeDateInput('', true))).toEqual({
      value: '',
      rejected: true
    })
    expect(readValidDateInput(fakeDateInput('2026-06-31'))).toEqual({
      value: '',
      rejected: true
    })
    expect(readValidDateInput(fakeDateInput('2026-06-30'))).toEqual({
      value: '2026-06-30',
      rejected: false
    })
  })

  it('sanitizeDateInputValue clears invalid and clamps to min/max', () => {
    const invalid = fakeDateInput('2026-06-31')
    expect(sanitizeDateInputValue(invalid)).toBe('')
    expect(invalid.value).toBe('')

    const early = fakeDateInput('2026-06-01')
    expect(sanitizeDateInputValue(early, { min: '2026-06-10' })).toBe('2026-06-10')
    expect(early.value).toBe('2026-06-10')
  })
})
