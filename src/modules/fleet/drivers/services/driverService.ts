import { createCrudService } from '@/core/factories'
import { driverApi } from '../api/driverApi'
import type { DriverApi, DriverSearchColumn } from '../types/driver.types'

export const driverService = createCrudService<DriverApi, DriverSearchColumn>(driverApi)
