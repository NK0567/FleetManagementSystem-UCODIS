import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  PlanningDashboardApi,
  ReportFilters,
  TransportReportApi
} from '../types/planningReport.types'

/** Only the filters set are sent: an empty one does not filter. */
const paramsOf = (filters: ReportFilters) =>
  Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value || undefined]))

export const planningReportApi = {
  dashboard: (filters: ReportFilters) =>
    httpClient.get<SingleResponse<PlanningDashboardApi>>('/planning/dashboard', {
      params: paramsOf(filters)
    }),
  transport: (filters: ReportFilters) =>
    httpClient.get<SingleResponse<TransportReportApi>>('/planning/reports/transport', {
      params: paramsOf(filters)
    })
}
