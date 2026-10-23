import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { providerService } from '../services/providerService'
import type { ProviderApi, ProviderSearchColumn } from '../types/provider.types'

export const useProviderStore = defineStore('fleet-provider', () => {
  const crud = useCrudState<ProviderApi, ProviderSearchColumn>({
    persistKey: 'fleet-provider',
    service: providerService,
    defaultSearchColumn: 'no,name,contactName',
    entityLabelKey: 'fleet.providers.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
