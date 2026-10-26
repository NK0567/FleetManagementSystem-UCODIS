import {
  PLANNING_REASON_KINDS,
  type PlanningReasonApi
} from '@/modules/planning/reasons/types/planningReason.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { PlanningReasonRow } from '../../fixtures/planning/planningReasons'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'

type Fields = Omit<PlanningReasonRow, 'no' | keyof AuditFields>

export function planningReasonsApi(db: MockDatabase): PlanningReasonApi[] {
  return db.planningReasons.all()
}

export function registerPlanningReasonsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    kind: (input) =>
      readEnum(input, 'kind', PLANNING_REASON_KINDS, { required: true }) ?? 'cancellation',
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/planning/reasons',
    feature: 'PLANNINGREASON',
    collection: db.planningReasons,
    list: () => planningReasonsApi(db),
    searchColumns: ['no', 'name'],
    optionFields: { kind: 'planningReasonKind' },
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: () => undefined
  })
}
