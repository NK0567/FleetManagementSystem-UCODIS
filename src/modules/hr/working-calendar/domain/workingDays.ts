import { addDays, isoWeekday } from '@/utils/date'

export interface WorkingDay {
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  dayOfWeek: number
  working: boolean
  start: string
  end: string
  hasBreak: boolean
  breakStart: string
  breakEnd: string
}

export interface HolidayDate {
  date: string
  /** Recurring holidays repeat every year on the same month and day. */
  recurring: boolean
}

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function dailyWorkingMinutes(day: WorkingDay): number {
  if (!day.working) return 0
  const span = toMinutes(day.end) - toMinutes(day.start)
  const pause = day.hasBreak ? toMinutes(day.breakEnd) - toMinutes(day.breakStart) : 0
  return Math.max(0, span - pause)
}

export function weeklyWorkingMinutes(days: readonly WorkingDay[]): number {
  return days.reduce((total, day) => total + dailyWorkingMinutes(day), 0)
}

export function isPublicHoliday(date: string, holidays: readonly HolidayDate[]): boolean {
  return holidays.some((holiday) =>
    holiday.recurring ? holiday.date.slice(5, 10) === date.slice(5, 10) : holiday.date === date
  )
}

export function isWorkingDate(
  date: string,
  days: readonly WorkingDay[],
  holidays: readonly HolidayDate[]
): boolean {
  const weekday = isoWeekday(date)
  const day = days.find((candidate) => candidate.dayOfWeek === weekday)
  return !!day?.working && !isPublicHoliday(date, holidays)
}

/** Working days between two dates, both included; 0 when the range is reversed. */
export function countWorkingDays(
  startDate: string,
  endDate: string,
  days: readonly WorkingDay[],
  holidays: readonly HolidayDate[]
): number {
  let count = 0
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    if (isWorkingDate(date, days, holidays)) count++
  }
  return count
}
