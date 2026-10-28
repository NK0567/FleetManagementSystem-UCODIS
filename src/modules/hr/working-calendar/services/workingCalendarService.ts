import { workingCalendarApi } from '../api/workingCalendarApi'
import type { WorkingDay } from '../domain/workingDays'
import type { WorkingCalendarApi } from '../types/workingCalendar.types'

export const workingCalendarService = {
  async get(): Promise<WorkingCalendarApi> {
    return (await workingCalendarApi.get()).data.data
  },
  async update(days: WorkingDay[]): Promise<WorkingCalendarApi> {
    return (await workingCalendarApi.update(days)).data.data
  }
}
