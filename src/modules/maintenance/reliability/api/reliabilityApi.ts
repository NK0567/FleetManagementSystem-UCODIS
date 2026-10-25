import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  MaintenanceDashboardApi,
  ReliabilityApi,
  VehicleCostApi
} from '../types/reliability.types'

export const reliabilityApi = {
  get: (from: string, to: string) =>
    httpClient.get<SingleResponse<ReliabilityApi>>('/maintenance/reliability', {
      params: { from, to }
    }),
  vehicleCost: (vehicleNo: string, from: string, to: string) =>
    httpClient.get<SingleResponse<VehicleCostApi>>(
      `/maintenance/vehicle-costs/${encodeURIComponent(vehicleNo)}`,
      {
        params: { from, to }
      }
    ),
  dashboard: () => httpClient.get<SingleResponse<MaintenanceDashboardApi>>('/maintenance/dashboard')
}
