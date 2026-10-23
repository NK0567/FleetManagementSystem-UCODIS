import {
  CHECK_RESULTS,
  checkIssues,
  type CheckIssue,
  type CheckResult
} from '@/modules/fleet/check-points/domain/checkResult'
import {
  CHECK_POINT_SCOPES,
  type CheckPointApi,
  type CheckPointScope
} from '@/modules/fleet/check-points/types/checkPoint.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { CheckPointRow } from '../../fixtures/fleet/checkPoints'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { unprocessable } from '../../http/errors'
import { unknownReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

const CHECK_ISSUE_MESSAGES: Record<CheckIssue, (typeof FLEET_MESSAGES)['checksIncomplete']> = {
  incomplete: FLEET_MESSAGES.checksIncomplete,
  commentRequired: FLEET_MESSAGES.checksCommentRequired
}

type Fields = Omit<CheckPointRow, 'no' | keyof AuditFields>

export function checkPointsApi(db: MockDatabase): CheckPointApi[] {
  return db.checkPoints.all()
}

export function registerCheckPointsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    label: (input) => readString(input, 'label', { required: true }),
    scope: (input) => readEnum(input, 'scope', CHECK_POINT_SCOPES, { required: true }) ?? 'vehicle',
    blocking: (input) => readBoolean(input, 'blocking'),
    sortOrder: (input) => readNumber(input, 'sortOrder', { required: true, min: 1, max: 999 }) ?? 0,
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/check-points',
    feature: 'CHECKPOINT',
    collection: db.checkPoints,
    list: () => checkPointsApi(db),
    searchColumns: ['no', 'label'],
    optionFields: { scope: 'checkPointScope' },
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: () => undefined
  })
}

export function activeCheckPoints(db: MockDatabase, scope: CheckPointScope): CheckPointRow[] {
  return db.checkPoints
    .all()
    .filter((point) => point.active && point.scope === scope)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Results for every active point of the scope, labels copied from the points themselves: the
 * client only says which point got which result.
 */
export function readCheckResults(
  db: MockDatabase,
  input: Record<string, unknown>,
  scope: CheckPointScope,
  field = 'results'
): CheckResult[] {
  const raw = Array.isArray(input[field]) ? (input[field] as Record<string, unknown>[]) : []
  const points = activeCheckPoints(db, scope)
  if (raw.some((entry) => !points.some((point) => point.no === entry.pointNo))) {
    throw unknownReference(field)
  }
  const results = points.map((point) => {
    const entry = raw.find((candidate) => candidate.pointNo === point.no) ?? {}
    return {
      pointNo: point.no,
      label: point.label,
      blocking: point.blocking,
      result: readEnum(entry, 'result', CHECK_RESULTS),
      comment: readString(entry, 'comment')
    }
  })
  const [issue] = checkIssues(results)
  if (issue) throw unprocessable(CHECK_ISSUE_MESSAGES[issue])
  return results
}
