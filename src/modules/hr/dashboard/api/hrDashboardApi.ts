import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { HrDashboardApi } from '../types/hrDashboard.types'

export const hrDashboardApi = {
  get: () => httpClient.get<SingleResponse<HrDashboardApi>>('/hr/dashboard')
}
