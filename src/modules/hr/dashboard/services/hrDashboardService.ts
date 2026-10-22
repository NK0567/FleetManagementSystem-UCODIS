import { hrDashboardApi } from '../api/hrDashboardApi'
import type { HrDashboardApi } from '../types/hrDashboard.types'

export const hrDashboardService = {
  async get(): Promise<HrDashboardApi> {
    return (await hrDashboardApi.get()).data.data
  }
}
