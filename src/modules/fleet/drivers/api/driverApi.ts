import { createCrudApi } from '@/core/factories'
import type { DriverApi } from '../types/driver.types'

export const driverApi = createCrudApi<DriverApi>({ basePath: '/fleet/drivers' })
