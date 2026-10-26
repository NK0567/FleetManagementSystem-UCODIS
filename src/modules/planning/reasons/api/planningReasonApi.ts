import { createCrudApi } from '@/core/factories'
import type { PlanningReasonApi } from '../types/planningReason.types'

export const planningReasonApi = createCrudApi<PlanningReasonApi>({
  basePath: '/planning/reasons'
})
