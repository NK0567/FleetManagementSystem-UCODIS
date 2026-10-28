import { createCrudService } from '@/core/factories'
import { vehicleTypeApi } from '../api/vehicleTypeApi'
import type { VehicleTypeApi, VehicleTypeSearchColumn } from '../types/vehicleType.types'

export const vehicleTypeService = createCrudService<VehicleTypeApi, VehicleTypeSearchColumn>(
  vehicleTypeApi
)
