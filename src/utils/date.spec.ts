import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMinutes,
  minutesBetween,
  toIsoDateTime,
  daysBetween,
  isIsoDay,
  isoWeekday,
  shiftIsoDate,
  startOfIsoWeek,
  todayIso,
  toIsoDay
} from './date'

describe('date', () => {
  it('formats the local calendar day, not the UTC one', () => {
    expect(toIsoDay(new Date(2026, 8, 4, 23, 59))).toBe('2026-09-04')
    expect(todayIso(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts calendar days between two dates', () => {
    expect(daysBetween('2026-09-04', '2026-10-22')).toBe(48)
    expect(daysBetween('2026-09-04', '2026-09-01')).toBe(-3)
  })

  it('shifts dates and date-times while keeping the time part', () => {
    expect(shiftIsoDate('2026-09-04', 2)).toBe('2026-09-06')
    expect(shiftIsoDate('2026-09-04T08:30:00', 2)).toBe('2026-09-06T08:30:00')
    expect(shiftIsoDate('not a date', 2)).toBe('not a date')
    expect(shiftIsoDate('2026-09-04', 0)).toBe('2026-09-04')
  })

  it('recognizes ISO days', () => {
    expect(isIsoDay('2026-09-04')).toBe(true)
    expect(isIsoDay('04/09/2026')).toBe(false)
    expect(isIsoDay(20260904)).toBe(false)
  })

  it('computes ISO weekdays and week starts', () => {
    expect(isoWeekday('2026-09-04')).toBe(5)
    expect(isoWeekday('2026-09-06')).toBe(7)
    expect(startOfIsoWeek('2026-09-06')).toBe('2026-08-31')
    expect(startOfIsoWeek('2026-08-31')).toBe('2026-08-31')
  })

  it('adds minutes to local date-times across midnight, without any time zone', () => {
    expect(addMinutes('2026-09-04T22:30:00', 120)).toBe('2026-09-05T00:30:00')
    expect(toIsoDateTime(new Date(2026, 8, 4, 6, 5, 0))).toBe('2026-09-04T06:05:00')
    expect(minutesBetween('2026-09-04T06:05:00', '2026-09-04T13:35:00')).toBe(450)
  })
})
