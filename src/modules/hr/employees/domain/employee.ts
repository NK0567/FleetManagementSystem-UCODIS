import type { EmployeeStatus } from '../types/employee.types'

export function employeeFullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim()
}

/** Employees who left (archived or end of contract) no longer count in any headcount. */
export function isOnStaff(status: EmployeeStatus): boolean {
  return status !== 'archived' && status !== 'contract_ended'
}

/** Statuses an HR user may set by hand; archiving has its own action. */
export const MANUAL_EMPLOYEE_STATUSES = [
  'active',
  'on_leave',
  'suspended',
  'contract_ended'
] as const

export type ManualEmployeeStatus = (typeof MANUAL_EMPLOYEE_STATUSES)[number]

export function statusNeedsReason(status: EmployeeStatus): boolean {
  return status === 'suspended'
}
