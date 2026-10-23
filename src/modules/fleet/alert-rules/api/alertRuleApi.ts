import { createCrudApi } from '@/core/factories'
import type { AlertRuleApi } from '../types/alertRule.types'

export const alertRuleApi = createCrudApi<AlertRuleApi>({
  basePath: '/fleet/alert-rules'
})
