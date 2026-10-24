import {
  FAILURE_CODE_KINDS,
  type FailureCodeApi
} from '@/modules/maintenance/failure-codes/types/failureCode.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { FailureCodeRow } from '../../fixtures/maintenance/failureCodes'
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
import { conflict, unprocessable } from '../../http/errors'
import type { MockRouter } from '../../http/router'
import { MAINTENANCE_MESSAGES } from './messages'
import { optionalReference } from '../../http/references'

type Fields = Omit<FailureCodeRow, 'no' | keyof AuditFields>

export function failureCodesApi(db: MockDatabase): FailureCodeApi[] {
  const names = new Map(db.failureCodes.all().map((row) => [row.no, row.name]))
  const competences = new Map(db.competences.all().map((row) => [row.no, row.name]))
  return db.failureCodes.all().map((row) => ({
    ...row,
    parentName: row.parentNo ? (names.get(row.parentNo) ?? row.parentNo) : '',
    competenceName: row.competenceNo ? (competences.get(row.competenceNo) ?? row.competenceNo) : ''
  }))
}

export function registerFailureCodesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    kind: (input) => readEnum(input, 'kind', FAILURE_CODE_KINDS, { required: true }) ?? 'subsystem',
    parentNo: (input) => optionalReference(db.failureCodes, input, 'parentNo'),
    competenceNo: (input) => optionalReference(db.competences, input, 'competenceNo'),
    active: (input) => readBoolean(input, 'active', true)
  }

  /** Only a subsystem hangs under a system and calls for a skill. */
  function assertShape(code: Pick<FailureCodeRow, 'kind' | 'parentNo' | 'competenceNo'>) {
    if (code.kind !== 'subsystem') {
      if (code.parentNo || code.competenceNo) {
        throw unprocessable(MAINTENANCE_MESSAGES.failureCodeOnlySubsystemLinks)
      }
      return
    }
    if (!code.parentNo || db.failureCodes.find(code.parentNo)?.kind !== 'system') {
      throw unprocessable(MAINTENANCE_MESSAGES.failureSubsystemNeedsSystem)
    }
    if (!code.competenceNo) throw unprocessable(MAINTENANCE_MESSAGES.failureSubsystemNeedsSkill)
  }

  registerCrudResource(router, {
    basePath: '/maintenance/failure-codes',
    feature: 'FAILURECODE',
    collection: db.failureCodes,
    list: () => failureCodesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: { kind: 'failureCodeKind' },
    create: (input) => {
      const code = { no: readCode(input), ...readAll(input, readers) }
      assertShape(code)
      return code
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      assertShape({ ...existing, ...patch })
      return patch
    },
    remove: (existing) => {
      if (db.failureCodes.all().some((row) => row.parentNo === existing.no)) {
        throw conflict(MAINTENANCE_MESSAGES.failureSystemHasSubsystems)
      }
    }
  })
}
