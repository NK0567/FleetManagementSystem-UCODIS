import { createCrudService } from '@/core/factories'
import { vehicleCheckApi } from '../api/vehicleCheckApi'
import type { VehicleCheckApi, VehicleCheckSearchColumn } from '../types/vehicleCheck.types'

export const vehicleCheckService = createCrudService<VehicleCheckApi, VehicleCheckSearchColumn>(
  vehicleCheckApi
)
