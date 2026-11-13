import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { DriverReportApi } from '@/modules/fleet/driver-reports/types/driverReport.types'

export interface MyReportInput {
  kind: string
  severity: string
  urgency: string
  subject: string
  description: string
  occurredOn: string
}

/** What the driver reports on the road: anomalies, incidents, suggestions and feedback. */
export const myReportsApi = {
  list: () => httpClient.get<SingleResponse<DriverReportApi[]>>('/me/reports'),
  send: (input: MyReportInput) =>
    httpClient.post<SingleResponse<DriverReportApi>>('/me/reports', { ...input })
}
