import { planningReportApi } from '../api/planningReportApi'
import type {
  CarrierReportRow,
  PlanningDashboardApi,
  ReportPeriod
} from '../types/planningReport.types'

export const planningReportService = {
  async dashboard(): Promise<PlanningDashboardApi> {
    return (await planningReportApi.dashboard()).data.data
  },
  async carriers(period: ReportPeriod): Promise<CarrierReportRow[]> {
    return (await planningReportApi.carriers(period)).data.data
  }
}
