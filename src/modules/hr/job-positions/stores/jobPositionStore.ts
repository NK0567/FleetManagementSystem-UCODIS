import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { jobPositionService } from '../services/jobPositionService'
import type { JobPositionApi, JobPositionSearchColumn } from '../types/jobPosition.types'

export const useJobPositionStore = defineStore('hr-job-position', () => {
  const crud = useCrudState<JobPositionApi, JobPositionSearchColumn>({
    persistKey: 'hr-job-position',
    service: jobPositionService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'hr.jobPositions.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
