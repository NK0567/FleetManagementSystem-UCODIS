import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { inspectionItemService } from '../services/inspectionItemService'
import type { InspectionItemApi, InspectionItemSearchColumn } from '../types/inspectionItem.types'

export const useInspectionItemStore = defineStore('fleet-inspection-item', () => {
  const crud = useCrudState<InspectionItemApi, InspectionItemSearchColumn>({
    persistKey: 'fleet-inspection-item',
    service: inspectionItemService,
    defaultSearchColumn: 'no,label',
    entityLabelKey: 'fleet.inspectionItems.title',
    defaultSortBy: 'sortOrder'
  })

  return { ...crud }
})
