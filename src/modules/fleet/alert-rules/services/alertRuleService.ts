import { createCrudService } from '@/core/factories'
import { alertRuleApi } from '../api/alertRuleApi'
import type { AlertRuleApi, AlertRuleSearchColumn } from '../types/alertRule.types'

export const alertRuleService = createCrudService<AlertRuleApi, AlertRuleSearchColumn>(alertRuleApi)
