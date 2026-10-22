import type { ReferenceItem } from '@/types/reference.types'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import type { Collection, MockRow } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { badRequest } from '../../http/errors'
import { readString } from '../../http/input'
import { COMPANY_SITES } from '../../fixtures/company'
import { HR_MESSAGES } from './messages'

function unknownReference(field: string) {
  return badRequest(
    HR_MESSAGES.unknownReference,
    { field },
    { errorCode: 'UNKNOWN_REFERENCE', errors: [field] }
  )
}

/** A required code that must point to an existing record. */
export function requireReference(
  collection: Collection<MockRow>,
  input: Record<string, unknown>,
  field: string
): string {
  const code = readString(input, field, { required: true })
  if (!collection.exists(code)) throw unknownReference(field)
  return code
}

export function optionalReference(
  collection: Collection<MockRow>,
  input: Record<string, unknown>,
  field: string
): string | null {
  const code = readString(input, field)
  if (!code) return null
  if (!collection.exists(code)) throw unknownReference(field)
  return code
}

export function requireSite(input: Record<string, unknown>, field = 'siteCode'): string {
  const code = readString(input, field, { required: true })
  if (!COMPANY_SITES.some((site) => site.code === code)) throw unknownReference(field)
  return code
}

/** Small lists served by GET /reference/all for selects, lookups and filters. */
export function hrReferenceData(db: MockDatabase): Record<string, ReferenceItem[]> {
  return {
    sites: COMPANY_SITES,
    orgUnits: db.orgUnits.all().map((unit) => ({
      code: unit.no,
      description: unit.name,
      parentCode: unit.parentNo ?? undefined
    })),
    jobPositions: db.jobPositions
      .all()
      .map((position) => ({ code: position.no, description: position.name })),
    employeeCategories: db.employeeCategories.all().map((category) => ({
      code: category.no,
      description: category.name,
      active: category.active
    })),
    leaveTypes: db.leaveTypes
      .all()
      .map((type) => ({ code: type.no, description: type.name, active: type.active })),
    employees: db.employees
      .all()
      .filter((employee) => isOnStaff(employee.status))
      .map((employee) => ({ code: employee.no, description: employeeFullName(employee) }))
  }
}
