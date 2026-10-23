import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { alertRuleService } from '../services/alertRuleService'
import type { AlertRuleApi, AlertRuleSearchColumn } from '../types/alertRule.types'

export const useAlertRuleStore = defineStore('fleet-alert-rule', () => {
  const crud = useCrudState<AlertRuleApi, AlertRuleSearchColumn>({
    persistKey: 'fleet-alert-rule',
    service: alertRuleService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.alertRules.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
