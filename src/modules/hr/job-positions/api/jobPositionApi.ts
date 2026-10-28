import { createCrudApi } from '@/core/factories'
import type { JobPositionApi } from '../types/jobPosition.types'

export const jobPositionApi = createCrudApi<JobPositionApi>({ basePath: '/hr/job-positions' })
