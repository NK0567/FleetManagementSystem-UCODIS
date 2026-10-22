import { ORG_UNIT_TYPES } from '@/modules/hr/org-units/types/orgUnit.types'
import { wouldCreateCycle } from '@/modules/hr/org-units/domain/orgTree'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { conflict, requiredField, unprocessable } from '../../http/errors'
import { registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import {
  has,
  readAll,
  readCode,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import type { OrgUnitRow } from '../../fixtures/hr/orgUnits'
import { HR_MESSAGES } from './messages'
import { optionalReference, requireReference, requireSite } from './references'
import { orgUnitsApi } from './views'

type EditableFields = Pick<OrgUnitRow, 'name' | 'type' | 'managerNo' | 'siteCode' | 'description'>

export function registerOrgUnitHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    name: (input) => readString(input, 'name', { required: true }),
    type: (input) => readEnum(input, 'type', ORG_UNIT_TYPES, { required: true }) ?? 'department',
    managerNo: (input) => optionalReference(db.employees, input, 'managerNo'),
    siteCode: (input) => requireSite(input),
    description: (input) => readString(input, 'description')
  }

  /** The chart has a single root: every other unit hangs under an existing one, without loops. */
  function readParent(input: Record<string, unknown>, unit: OrgUnitRow | null): string | null {
    if (unit && unit.parentNo === null) {
      if (input.parentNo) throw unprocessable(HR_MESSAGES.orgUnitCycle)
      return null
    }
    if (!input.parentNo) throw requiredField('parentNo')
    const parentNo = requireReference(db.orgUnits, input, 'parentNo')
    if (unit && wouldCreateCycle(db.orgUnits.all(), unit.no, parentNo)) {
      throw unprocessable(HR_MESSAGES.orgUnitCycle)
    }
    return parentNo
  }

  registerCrudResource(router, {
    basePath: '/hr/org-units',
    feature: 'ORGUNIT',
    collection: db.orgUnits,
    list: () => orgUnitsApi(db),
    searchColumns: ['no', 'name'],
    optionFields: { type: 'orgUnitType', status: 'orgUnitStatus' },
    create: (input) => ({
      no: readCode(input),
      parentNo: readParent(input, null),
      ...readAll(input, readers),
      status: 'pending_validation' as const,
      submittedAt: nowIso(),
      validatedAt: null,
      validatedBy: null
    }),
    update: (existing, input) => ({
      ...readPatch(input, readers),
      ...(has(input, 'parentNo') ? { parentNo: readParent(input, existing) } : {})
    }),
    remove: (existing) => {
      const units = db.orgUnits.all()
      if (units.some((unit) => unit.parentNo === existing.no)) {
        throw conflict(HR_MESSAGES.orgUnitHasChildren)
      }
      if (db.employees.all().some((employee) => employee.orgUnitNo === existing.no)) {
        throw conflict(HR_MESSAGES.orgUnitHasEmployees)
      }
      if (db.jobPositions.all().some((position) => position.orgUnitNo === existing.no)) {
        throw conflict(HR_MESSAGES.orgUnitHasPositions)
      }
    }
  })

  router.post(
    '/hr/org-units/:no/validate',
    { feature: 'ORGUNIT', action: 'execute' },
    (request) => {
      const unit = db.orgUnits.findOrFail(routeParam(request, 'no'))
      if (unit.status === 'validated') throw conflict(HR_MESSAGES.orgUnitAlreadyValidated)
      db.orgUnits.update(unit.no, {
        status: 'validated',
        validatedAt: nowIso(),
        validatedBy: sessionUser(request).code,
        ...stampModified(request)
      })
      return ok(orgUnitsApi(db).find((row) => row.no === unit.no))
    }
  )
}
