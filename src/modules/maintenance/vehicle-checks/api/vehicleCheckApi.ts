import { createCrudApi } from '@/core/factories'
import type { VehicleCheckApi } from '../types/vehicleCheck.types'

export const vehicleCheckApi = createCrudApi<VehicleCheckApi>({
  basePath: '/maintenance/vehicle-checks'
})
