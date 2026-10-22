import type { WorkingDay } from '../domain/workingDays'

export interface WorkingCalendarApi {
  days: WorkingDay[]
  weeklyMinutes: number
  modifiedAt: string
  modifiedBy: string
}
