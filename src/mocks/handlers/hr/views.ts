import type { EmployeeApi } from '@/modules/hr/employees/types/employee.types'
import type { EmployeeCategoryApi } from '@/modules/hr/employee-categories/types/employeeCategory.types'
import type { JobPositionApi } from '@/modules/hr/job-positions/types/jobPosition.types'
import type { LeaveBalanceApi } from '@/modules/hr/leave-balances/types/leaveBalance.types'
import type { LeaveRequestApi } from '@/modules/hr/leave-requests/types/leaveRequest.types'
import type { OrgUnitApi } from '@/modules/hr/org-units/types/orgUnit.types'
import { ANNUAL_LEAVE_TYPE_NO } from '@/modules/hr/leave-types/types/leaveType.types'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import { computeLeaveBalance } from '@/modules/hr/leave-balances/domain/leaveBalance'
import { descendantNos } from '@/modules/hr/org-units/domain/orgTree'
import { countWorkingDays } from '@/modules/hr/working-calendar/domain/workingDays'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { MOCK_ACCOUNTS } from '../../fixtures/auth/users'
import { WORKING_CALENDAR_NO } from '../../fixtures/hr/calendar'
import type { EmployeeRow } from '../../fixtures/hr/employees'
import type { LeaveRequestRow } from '../../fixtures/hr/leave'

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  return counts
}

function staffOf(db: MockDatabase): EmployeeRow[] {
  return db.employees.all().filter((employee) => isOnStaff(employee.status))
}

function employeeNames(db: MockDatabase): Map<string, string> {
  return new Map(db.employees.all().map((employee) => [employee.no, employeeFullName(employee)]))
}

export function workingDaysOf(db: MockDatabase, startDate: string, endDate: string): number {
  const calendar = db.workingCalendar.find(WORKING_CALENDAR_NO)
  return countWorkingDays(startDate, endDate, calendar?.days ?? [], db.publicHolidays.all())
}

export function orgUnitsApi(db: MockDatabase): OrgUnitApi[] {
  const units = db.orgUnits.all()
  const unitNames = new Map(units.map((unit) => [unit.no, unit.name]))
  const names = employeeNames(db)
  const direct = countBy(staffOf(db), (employee) => employee.orgUnitNo)
  return units.map((unit) => ({
    ...unit,
    parentName: unit.parentNo ? (unitNames.get(unit.parentNo) ?? '') : '',
    managerName: unit.managerNo ? (names.get(unit.managerNo) ?? '') : '',
    headcount: direct.get(unit.no) ?? 0,
    totalHeadcount: [unit.no, ...descendantNos(units, unit.no)].reduce(
      (total, no) => total + (direct.get(no) ?? 0),
      0
    )
  }))
}

export function employeeCategoriesApi(db: MockDatabase): EmployeeCategoryApi[] {
  const counts = countBy(staffOf(db), (employee) => employee.categoryNo)
  return db.employeeCategories
    .all()
    .map((category) => ({ ...category, employeeCount: counts.get(category.no) ?? 0 }))
}

export function jobPositionsApi(db: MockDatabase): JobPositionApi[] {
  const unitNames = new Map(db.orgUnits.all().map((unit) => [unit.no, unit.name]))
  const counts = countBy(staffOf(db), (employee) => employee.jobPositionNo)
  return db.jobPositions.all().map((position) => {
    const actualHeadcount = counts.get(position.no) ?? 0
    return {
      ...position,
      orgUnitName: unitNames.get(position.orgUnitNo) ?? '',
      actualHeadcount,
      headcountGap: position.plannedHeadcount - actualHeadcount
    }
  })
}

export function employeesApi(db: MockDatabase): EmployeeApi[] {
  const units = new Map(db.orgUnits.all().map((unit) => [unit.no, unit.name]))
  const positions = new Map(db.jobPositions.all().map((position) => [position.no, position]))
  const categories = new Map(
    db.employeeCategories.all().map((category) => [category.no, category.name])
  )
  const accounts = new Set(MOCK_ACCOUNTS.map((account) => account.employeeNo))
  return db.employees.all().map((employee) => {
    const position = positions.get(employee.jobPositionNo)
    return {
      ...employee,
      fullName: employeeFullName(employee),
      jobPositionName: position?.name ?? '',
      orgUnitName: units.get(employee.orgUnitNo) ?? '',
      categoryName: categories.get(employee.categoryNo) ?? '',
      drives: position?.drives ?? false,
      hasSystemAccount: accounts.has(employee.no)
    }
  })
}

export function leaveRequestApi(db: MockDatabase, row: LeaveRequestRow): LeaveRequestApi {
  const employee = db.employees.find(row.employeeNo)
  return {
    ...row,
    employeeName: employee ? employeeFullName(employee) : row.employeeNo,
    orgUnitNo: employee?.orgUnitNo ?? '',
    leaveTypeName: db.leaveTypes.find(row.leaveTypeNo)?.name ?? row.leaveTypeNo,
    days: workingDaysOf(db, row.startDate, row.endDate)
  }
}

export function leaveRequestsApi(db: MockDatabase): LeaveRequestApi[] {
  return db.leaveRequests.all().map((row) => leaveRequestApi(db, row))
}

/** One balance per employee on staff and leave type tracked in balances, for the current year. */
export function leaveBalancesApi(
  db: MockDatabase,
  year = Number(todayIso().slice(0, 4))
): LeaveBalanceApi[] {
  const types = db.leaveTypes.all().filter((type) => type.active && type.tracksBalance)
  const categories = new Map(db.employeeCategories.all().map((category) => [category.no, category]))
  const adjustments = new Map(db.leaveBalanceAdjustments.all().map((row) => [row.no, row]))
  const requests = leaveRequestsApi(db).filter((request) =>
    request.startDate.startsWith(String(year))
  )

  return staffOf(db).flatMap((employee) =>
    types.map((type) => {
      const adjustment = adjustments.get(`${employee.no}-${type.no}`)
      const ownRequests = requests.filter(
        (request) => request.employeeNo === employee.no && request.leaveTypeNo === type.no
      )
      const daysWith = (status: LeaveRequestApi['status']) =>
        ownRequests
          .filter((request) => request.status === status)
          .reduce((sum, request) => sum + request.days, 0)
      const entitlementDays =
        type.no === ANNUAL_LEAVE_TYPE_NO
          ? (categories.get(employee.categoryNo)?.annualLeaveDays ?? 0)
          : (type.annualEntitlementDays ?? 0)
      return {
        no: `${employee.no}-${type.no}-${year}`,
        employeeNo: employee.no,
        employeeName: employeeFullName(employee),
        orgUnitNo: employee.orgUnitNo,
        leaveTypeNo: type.no,
        leaveTypeName: type.name,
        year,
        ...computeLeaveBalance({
          entitlementDays,
          carriedOverDays: adjustment?.carriedOverDays ?? 0,
          adjustmentDays: adjustment?.adjustmentDays ?? 0,
          takenDays: daysWith('approved'),
          pendingDays: daysWith('pending')
        })
      }
    })
  )
}
