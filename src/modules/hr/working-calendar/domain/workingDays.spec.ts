import { describe, expect, it } from 'vitest'
import {
  countWorkingDays,
  dailyWorkingMinutes,
  isPublicHoliday,
  weeklyWorkingMinutes,
  type WorkingDay
} from './workingDays'

function day(dayOfWeek: number, working = true): WorkingDay {
  return {
    dayOfWeek,
    working,
    start: '07:30',
    end: '16:30',
    hasBreak: true,
    breakStart: '12:00',
    breakEnd: '13:00'
  }
}

const mondayToSaturday = [1, 2, 3, 4, 5, 6].map((weekday) => day(weekday)).concat(day(7, false))

describe('working day rules', () => {
  it('counts the effective minutes of a day without the break', () => {
    expect(dailyWorkingMinutes(day(1))).toBe(480)
    expect(dailyWorkingMinutes({ ...day(1), hasBreak: false })).toBe(540)
    expect(dailyWorkingMinutes(day(7, false))).toBe(0)
    expect(weeklyWorkingMinutes(mondayToSaturday)).toBe(6 * 480)
  })

  it('matches recurring holidays on month and day in any year', () => {
    const holidays = [
      { date: '2026-06-26', recurring: true },
      { date: '2026-04-06', recurring: false }
    ]
    expect(isPublicHoliday('2027-06-26', holidays)).toBe(true)
    expect(isPublicHoliday('2027-04-06', holidays)).toBe(false)
    expect(isPublicHoliday('2026-04-06', holidays)).toBe(true)
  })

  it('counts working days, skipping rest days and holidays', () => {
    // Monday 14 to Monday 21 September 2026: Sunday 20 is a rest day.
    expect(countWorkingDays('2026-09-14', '2026-09-21', mondayToSaturday, [])).toBe(7)
    expect(
      countWorkingDays('2026-09-14', '2026-09-21', mondayToSaturday, [
        { date: '2025-09-16', recurring: true }
      ])
    ).toBe(6)
  })

  it('returns 0 for a reversed range and 1 for a single working day', () => {
    expect(countWorkingDays('2026-09-21', '2026-09-14', mondayToSaturday, [])).toBe(0)
    expect(countWorkingDays('2026-09-14', '2026-09-14', mondayToSaturday, [])).toBe(1)
    expect(countWorkingDays('2026-09-20', '2026-09-20', mondayToSaturday, [])).toBe(0)
  })
})
