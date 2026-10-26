import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { planningReasonService } from '../services/planningReasonService'
import type { PlanningReasonApi, PlanningReasonSearchColumn } from '../types/planningReason.types'

export const usePlanningReasonStore = defineStore('planning-reason', () => {
  const crud = useCrudState<PlanningReasonApi, PlanningReasonSearchColumn>({
    persistKey: 'planning-reason',
    service: planningReasonService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'planning.reasons.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
