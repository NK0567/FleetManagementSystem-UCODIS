import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { FleetReportApi, ReportFilters, ReportKind } from '../types/fleetReport.types'

export const fleetReportApi = {
  get: (kind: ReportKind, filters: ReportFilters) =>
    httpClient.get<SingleResponse<FleetReportApi>>(`/fleet/reports/${kind}`, {
      params: { from: filters.from, to: filters.to, siteNo: filters.siteNo ?? undefined }
    })
}
