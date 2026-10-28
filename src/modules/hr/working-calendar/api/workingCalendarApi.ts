import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { WorkingDay } from '../domain/workingDays'
import type { WorkingCalendarApi } from '../types/workingCalendar.types'

const basePath = '/hr/working-calendar'

export const workingCalendarApi = {
  get: () => httpClient.get<SingleResponse<WorkingCalendarApi>>(basePath),
  update: (days: WorkingDay[]) =>
    httpClient.put<SingleResponse<WorkingCalendarApi>>(basePath, { days })
}
