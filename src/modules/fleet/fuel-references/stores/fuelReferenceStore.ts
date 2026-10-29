import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { fuelReferenceService } from '../services/fuelReferenceService'
import type { FuelReferenceApi, FuelReferenceSearchColumn } from '../types/fuelReference.types'

export const useFuelReferenceStore = defineStore('fleet-fuel-reference', () => {
  const crud = useCrudState<FuelReferenceApi, FuelReferenceSearchColumn>({
    persistKey: 'fleet-fuel-reference',
    service: fuelReferenceService,
    defaultSearchColumn: 'vehiclePlate,routeName',
    entityLabelKey: 'fleet.fuelReferences.title',
    defaultSortBy: 'vehiclePlate'
  })

  return { ...crud }
})
