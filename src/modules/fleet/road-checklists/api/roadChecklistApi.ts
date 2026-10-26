import { createCrudApi } from '@/core/factories'
import type { RoadChecklistApi } from '../types/roadChecklist.types'

export const roadChecklistApi = createCrudApi<RoadChecklistApi>({
  basePath: '/fleet/road-checklists'
})
