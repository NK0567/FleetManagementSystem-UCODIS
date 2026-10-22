import { addDays, isoWeekday } from '@/utils/date'
import {
  dailyWorkingMinutes,
  isPublicHoliday,
  type HolidayDate,
  type WorkingDay
} from '../../working-calendar/domain/workingDays'
import type { PlanningDay, PlanningLeave } from '../types/myPlanning.types'

export interface PlanningLeaveSource extends PlanningLeave {
  startDate: string
  endDate: string
}

/**
 * The seven days of a week as one employee lives them: the company hours, unless a holiday or
 * one of their leave requests covers the day. Sent-back and rejected requests do not count.
 */
export function buildWeekPlanning(
  weekStart: string,
  calendar: readonly WorkingDay[],
  holidays: readonly (HolidayDate & { name: string })[],
  leave: readonly PlanningLeaveSource[]
): PlanningDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const dayOfWeek = isoWeekday(date)
    const hours = calendar.find((day) => day.dayOfWeek === dayOfWeek)
    const holiday = holidays.find((candidate) => isPublicHoliday(date, [candidate]))
    const covering = leave.find(
      (request) =>
        (request.status === 'approved' || request.status === 'pending') &&
        request.startDate <= date &&
        request.endDate >= date
    )
    const working = !!hours?.working && !holiday
    return {
      date,
      dayOfWeek,
      working,
      start: hours?.start ?? '',
      end: hours?.end ?? '',
      hasBreak: hours?.hasBreak ?? false,
      breakStart: hours?.breakStart ?? '',
      breakEnd: hours?.breakEnd ?? '',
      minutes: working && hours ? dailyWorkingMinutes(hours) : 0,
      holiday: holiday?.name ?? null,
      leave: covering
        ? { no: covering.no, leaveTypeName: covering.leaveTypeName, status: covering.status }
        : null
    }
  })
}
