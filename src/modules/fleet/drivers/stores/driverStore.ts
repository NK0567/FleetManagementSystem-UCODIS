import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { driverService } from '../services/driverService'
import type { DriverApi, DriverSearchColumn } from '../types/driver.types'

export const useDriverStore = defineStore('fleet-driver', () => {
  const crud = useCrudState<DriverApi, DriverSearchColumn>({
    persistKey: 'fleet-driver',
    service: driverService,
    defaultSearchColumn: 'no,fullName,phone,vehiclePlate',
    entityLabelKey: 'fleet.drivers.title',
    defaultSortBy: 'fullName'
  })

  return { ...crud }
})
