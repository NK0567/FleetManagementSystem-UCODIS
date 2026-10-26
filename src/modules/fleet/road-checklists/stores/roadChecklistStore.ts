import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { roadChecklistService } from '../services/roadChecklistService'
import type { RoadChecklistApi, RoadChecklistSearchColumn } from '../types/roadChecklist.types'

export const useRoadChecklistStore = defineStore('fleet-road-checklist', () => {
  const crud = useCrudState<RoadChecklistApi, RoadChecklistSearchColumn>({
    persistKey: 'fleet-road-checklist',
    service: roadChecklistService,
    defaultSearchColumn: 'no,tripNo,vehiclePlate',
    entityLabelKey: 'fleet.roadChecklists.title',
    defaultSortBy: 'takenAt',
    defaultSortDirection: 'DESC'
  })

  return { ...crud }
})
