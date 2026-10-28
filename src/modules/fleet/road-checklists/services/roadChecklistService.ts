import { createCrudService } from '@/core/factories'
import { roadChecklistApi } from '../api/roadChecklistApi'
import type { RoadChecklistApi, RoadChecklistSearchColumn } from '../types/roadChecklist.types'

export const roadChecklistService = createCrudService<RoadChecklistApi, RoadChecklistSearchColumn>(
  roadChecklistApi
)
