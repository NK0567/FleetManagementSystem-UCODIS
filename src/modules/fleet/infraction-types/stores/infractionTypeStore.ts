import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { infractionTypeService } from '../services/infractionTypeService'
import type { InfractionTypeApi, InfractionTypeSearchColumn } from '../types/infractionType.types'

export const useInfractionTypeStore = defineStore('fleet-infraction-type', () => {
  const crud = useCrudState<InfractionTypeApi, InfractionTypeSearchColumn>({
    persistKey: 'fleet-infraction-type',
    service: infractionTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.infractionTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
