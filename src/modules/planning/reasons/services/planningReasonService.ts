import { createCrudService } from '@/core/factories'
import { planningReasonApi } from '../api/planningReasonApi'
import type { PlanningReasonApi, PlanningReasonSearchColumn } from '../types/planningReason.types'

export const planningReasonService = createCrudService<
  PlanningReasonApi,
  PlanningReasonSearchColumn
>(planningReasonApi)
