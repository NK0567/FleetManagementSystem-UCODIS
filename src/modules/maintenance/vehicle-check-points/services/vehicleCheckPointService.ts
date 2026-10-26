import { createCrudService } from '@/core/factories'
import { vehicleCheckPointApi } from '../api/vehicleCheckPointApi'
import type {
  VehicleCheckPointApi,
  VehicleCheckPointSearchColumn
} from '../types/vehicleCheckPoint.types'

export const vehicleCheckPointService = createCrudService<
  VehicleCheckPointApi,
  VehicleCheckPointSearchColumn
>(vehicleCheckPointApi)
