import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { checkPointService } from '../services/checkPointService'
import type { CheckPointApi, CheckPointSearchColumn } from '../types/checkPoint.types'

export const useCheckPointStore = defineStore('fleet-check-point', () => {
  const crud = useCrudState<CheckPointApi, CheckPointSearchColumn>({
    persistKey: 'fleet-check-point',
    service: checkPointService,
    defaultSearchColumn: 'no,label',
    entityLabelKey: 'fleet.checkPoints.title',
    defaultSortBy: 'sortOrder'
  })

  return { ...crud }
})
