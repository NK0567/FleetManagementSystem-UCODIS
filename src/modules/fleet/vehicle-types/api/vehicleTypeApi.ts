import { createCrudApi } from '@/core/factories'
import type { VehicleTypeApi } from '../types/vehicleType.types'

export const vehicleTypeApi = createCrudApi<VehicleTypeApi>({
  basePath: '/fleet/vehicle-types'
})
