import { fleetDashboardApi } from '../api/fleetDashboardApi'
import type { FleetDashboardApi } from '../types/fleetDashboard.types'

export const fleetDashboardService = {
  async get(): Promise<FleetDashboardApi> {
    return (await fleetDashboardApi.get()).data.data
  }
}
