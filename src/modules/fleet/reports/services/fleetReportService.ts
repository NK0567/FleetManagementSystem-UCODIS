import { fleetReportApi } from '../api/fleetReportApi'
import type { FleetReportApi, ReportFilters, ReportKind } from '../types/fleetReport.types'

export const fleetReportService = {
  async get(kind: ReportKind, filters: ReportFilters): Promise<FleetReportApi> {
    return (await fleetReportApi.get(kind, filters)).data.data
  }
}
