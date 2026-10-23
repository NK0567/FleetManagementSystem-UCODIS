import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { deviationTypeService } from '../services/deviationTypeService'
import type { DeviationTypeApi, DeviationTypeSearchColumn } from '../types/deviationType.types'

export const useDeviationTypeStore = defineStore('fleet-deviation-type', () => {
  const crud = useCrudState<DeviationTypeApi, DeviationTypeSearchColumn>({
    persistKey: 'fleet-deviation-type',
    service: deviationTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.deviationTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
