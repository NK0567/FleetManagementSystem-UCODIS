import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { providerTypeService } from '../services/providerTypeService'
import type { ProviderTypeApi, ProviderTypeSearchColumn } from '../types/providerType.types'

export const useProviderTypeStore = defineStore('fleet-provider-type', () => {
  const crud = useCrudState<ProviderTypeApi, ProviderTypeSearchColumn>({
    persistKey: 'fleet-provider-type',
    service: providerTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.providerTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
