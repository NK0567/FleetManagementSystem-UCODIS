import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  CarrierReportRow,
  PlanningDashboardApi,
  ReportPeriod
} from '../types/planningReport.types'

export const planningReportApi = {
  dashboard: () => httpClient.get<SingleResponse<PlanningDashboardApi>>('/planning/dashboard'),
  carriers: (period: ReportPeriod) =>
    httpClient.get<SingleResponse<CarrierReportRow[]>>('/planning/reports/carriers', {
      params: { from: period.from || undefined, to: period.to || undefined }
    })
}
