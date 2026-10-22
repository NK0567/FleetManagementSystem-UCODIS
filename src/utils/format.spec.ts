import { describe, expect, it } from 'vitest'
import { formatMinutes, formatWeekday } from './format'

describe('format', () => {
  it('names ISO weekdays in the active language', () => {
    expect(formatWeekday(1)).toBe('lundi')
    expect(formatWeekday(7)).toBe('dimanche')
  })

  it('writes durations in hours and minutes', () => {
    expect(formatMinutes(480)).toBe('8 h')
    expect(formatMinutes(450)).toBe('7 h 30')
    expect(formatMinutes(5)).toBe('0 h 05')
  })
})
