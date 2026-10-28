import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { vehicleCheckPointService } from '../services/vehicleCheckPointService'
import type {
  VehicleCheckPointApi,
  VehicleCheckPointSearchColumn
} from '../types/vehicleCheckPoint.types'

export const useVehicleCheckPointStore = defineStore('maintenance-vehicle-check-point', () => {
  const crud = useCrudState<VehicleCheckPointApi, VehicleCheckPointSearchColumn>({
    persistKey: 'maintenance-vehicle-check-point',
    service: vehicleCheckPointService,
    defaultSearchColumn: 'no,label',
    entityLabelKey: 'maintenance.vehicleCheckPoints.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
