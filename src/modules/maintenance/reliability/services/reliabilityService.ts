import { reliabilityApi } from '../api/reliabilityApi'
import type {
  MaintenanceDashboardApi,
  ReliabilityApi,
  VehicleCostApi
} from '../types/reliability.types'

export const reliabilityService = {
  async get(from: string, to: string): Promise<ReliabilityApi> {
    return (await reliabilityApi.get(from, to)).data.data
  },
  async vehicleCost(vehicleNo: string, from: string, to: string): Promise<VehicleCostApi> {
    return (await reliabilityApi.vehicleCost(vehicleNo, from, to)).data.data
  },
  async dashboard(): Promise<MaintenanceDashboardApi> {
    return (await reliabilityApi.dashboard()).data.data
  }
}
