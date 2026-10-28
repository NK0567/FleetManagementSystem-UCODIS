import { createCrudService } from '@/core/factories'
import { jobPositionApi } from '../api/jobPositionApi'
import type { JobPositionApi, JobPositionSearchColumn } from '../types/jobPosition.types'

export const jobPositionService = createCrudService<JobPositionApi, JobPositionSearchColumn>(
  jobPositionApi
)
