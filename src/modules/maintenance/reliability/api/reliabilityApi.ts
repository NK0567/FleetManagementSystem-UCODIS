import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { MaintenanceDashboardApi, ReliabilityApi } from '../types/reliability.types'

export const reliabilityApi = {
  get: (from: string, to: string) =>
    httpClient.get<SingleResponse<ReliabilityApi>>('/maintenance/reliability', {
      params: { from, to }
    }),
  dashboard: () => httpClient.get<SingleResponse<MaintenanceDashboardApi>>('/maintenance/dashboard')
}
