import { createCrudApi } from '@/core/factories'
import type { VehicleCheckPointApi } from '../types/vehicleCheckPoint.types'

export const vehicleCheckPointApi = createCrudApi<VehicleCheckPointApi>({
  basePath: '/maintenance/vehicle-check-points'
})
