import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { vehicleCheckService } from '../services/vehicleCheckService'
import type { VehicleCheckApi, VehicleCheckSearchColumn } from '../types/vehicleCheck.types'

export const useVehicleCheckStore = defineStore('maintenance-vehicle-check', () => {
  const crud = useCrudState<VehicleCheckApi, VehicleCheckSearchColumn>({
    persistKey: 'maintenance-vehicle-check',
    service: vehicleCheckService,
    defaultSearchColumn: 'no,vehiclePlate',
    entityLabelKey: 'maintenance.vehicleChecks.title',
    defaultSortBy: 'checkedAt'
  })

  return { ...crud }
})
