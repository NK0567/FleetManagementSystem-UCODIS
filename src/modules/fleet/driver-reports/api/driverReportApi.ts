import { createCrudApi } from '@/core/factories'
import type { DriverReportApi } from '../types/driverReport.types'

const basePath = '/fleet/driver-reports'

export const driverReportApi = {
  ...createCrudApi<DriverReportApi>({ basePath })
}
