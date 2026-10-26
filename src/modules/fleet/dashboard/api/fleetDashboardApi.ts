import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { FleetDashboardApi } from '../types/fleetDashboard.types'

export const fleetDashboardApi = {
  get: () => httpClient.get<SingleResponse<FleetDashboardApi>>('/fleet/dashboard')
}
