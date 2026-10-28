import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { vehicleTypeService } from '../services/vehicleTypeService'
import type { VehicleTypeApi, VehicleTypeSearchColumn } from '../types/vehicleType.types'

export const useVehicleTypeStore = defineStore('fleet-vehicle-type', () => {
  const crud = useCrudState<VehicleTypeApi, VehicleTypeSearchColumn>({
    persistKey: 'fleet-vehicle-type',
    service: vehicleTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.vehicleTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
