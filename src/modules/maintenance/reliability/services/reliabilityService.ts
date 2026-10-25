import { reliabilityApi } from '../api/reliabilityApi'
import type { MaintenanceDashboardApi, ReliabilityApi } from '../types/reliability.types'

export const reliabilityService = {
  async get(from: string, to: string): Promise<ReliabilityApi> {
    return (await reliabilityApi.get(from, to)).data.data
  },
  async dashboard(): Promise<MaintenanceDashboardApi> {
    return (await reliabilityApi.dashboard()).data.data
  }
}
