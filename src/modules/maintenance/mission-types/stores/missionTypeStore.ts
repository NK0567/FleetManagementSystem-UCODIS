import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { missionTypeService } from '../services/missionTypeService'
import type { MissionTypeApi, MissionTypeSearchColumn } from '../types/missionType.types'

export const useMissionTypeStore = defineStore('maintenance-mission-type', () => {
  const crud = useCrudState<MissionTypeApi, MissionTypeSearchColumn>({
    persistKey: 'maintenance-mission-type',
    service: missionTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'maintenance.missionTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
