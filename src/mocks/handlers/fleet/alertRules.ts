import type { AlertRuleApi } from '@/modules/fleet/alert-rules/types/alertRule.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { AlertRuleRow } from '../../fixtures/fleet/alertRules'
import { registerCrudResource } from '../../http/crudResource'
import {
  readBoolean,
  readNumber,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'

type Fields = Omit<AlertRuleRow, 'no' | keyof AuditFields>

export function alertRulesApi(db: MockDatabase): AlertRuleApi[] {
  return db.alertRules.all()
}

export function registerAlertRulesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    recipients: (input) => readStringList(input, 'recipients'),
    escalationHours: (input) =>
      readNumber(input, 'escalationHours', { required: true, min: 1, max: 720 }) ?? 0,
    escalateTo: (input) => readString(input, 'escalateTo'),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/alert-rules',
    feature: 'ALERTRULE',
    collection: db.alertRules,
    list: () => alertRulesApi(db),
    searchColumns: ['no', 'name'],
    update: (_existing, input) => readPatch(input, readers)
  })
}
