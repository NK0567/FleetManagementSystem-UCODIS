import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { fuelGapCauseService } from '../services/fuelGapCauseService'
import type { FuelGapCauseApi, FuelGapCauseSearchColumn } from '../types/fuelGapCause.types'

export const useFuelGapCauseStore = defineStore('fleet-fuel-gap-cause', () => {
  const crud = useCrudState<FuelGapCauseApi, FuelGapCauseSearchColumn>({
    persistKey: 'fleet-fuel-gap-cause',
    service: fuelGapCauseService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.fuelGapCauses.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
