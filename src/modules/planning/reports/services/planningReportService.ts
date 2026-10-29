import { planningReportApi } from '../api/planningReportApi'
import type {
  PlanningDashboardApi,
  ReportFilters,
  TransportReportApi
} from '../types/planningReport.types'

export const planningReportService = {
  async dashboard(filters: ReportFilters): Promise<PlanningDashboardApi> {
    return (await planningReportApi.dashboard(filters)).data.data
  },
  async transport(filters: ReportFilters): Promise<TransportReportApi> {
    return (await planningReportApi.transport(filters)).data.data
  }
}
