import { createCrudService } from '@/core/factories'
import { driverReportApi } from '../api/driverReportApi'
import type { DriverReportApi, DriverReportSearchColumn } from '../types/driverReport.types'

export const driverReportService = {
  ...createCrudService<DriverReportApi, DriverReportSearchColumn>(driverReportApi)
}
