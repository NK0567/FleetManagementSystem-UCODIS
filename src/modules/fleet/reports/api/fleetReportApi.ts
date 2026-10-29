import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { FleetReportApi, ReportFilters, ReportKind } from '../types/fleetReport.types'

export const fleetReportApi = {
  get: (kind: ReportKind, filters: ReportFilters) =>
    httpClient.get<SingleResponse<FleetReportApi>>(`/fleet/reports/${kind}`, {
      params: {
        from: filters.from,
        to: filters.to,
        siteNo: filters.siteNo ?? undefined,
        compare: filters.compare ?? undefined,
        compareFrom: filters.compare === 'period' ? filters.compareFrom : undefined,
        compareTo: filters.compare === 'period' ? filters.compareTo : undefined,
        compareSiteNo:
          filters.compare === 'site' ? (filters.compareSiteNo ?? undefined) : undefined,
        groupBy: filters.groupBy
      }
    })
}
