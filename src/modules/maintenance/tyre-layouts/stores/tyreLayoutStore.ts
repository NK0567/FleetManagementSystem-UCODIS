import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { tyreLayoutService } from '../services/tyreLayoutService'
import type { TyreLayoutApi, TyreLayoutSearchColumn } from '../types/tyreLayout.types'

export const useTyreLayoutStore = defineStore('maintenance-tyre-layout', () => {
  const crud = useCrudState<TyreLayoutApi, TyreLayoutSearchColumn>({
    persistKey: 'maintenance-tyre-layout',
    service: tyreLayoutService,
    defaultSearchColumn: 'no,vehicleTypeName',
    entityLabelKey: 'maintenance.tyreLayouts.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
