import type { ReferenceItem } from '@/types/reference.types'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import type { MockDatabase } from '../../db/database'

/** Small lists served by GET /reference/all for selects, lookups and filters. */
export function hrReferenceData(db: MockDatabase): Record<string, ReferenceItem[]> {
  return {
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
