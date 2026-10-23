import {
  driverAvailability,
  driverIneligibility,
  type DriverFacts,
  type IneligibilityReason
} from '@/modules/fleet/drivers/domain/driver'
import type { DriverApi } from '@/modules/fleet/drivers/types/driver.types'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { EmployeeRow } from '../../fixtures/hr/employees'
import { registerListResource } from '../../http/crudResource'
import type { MockRouter } from '../../http/router'
import { localize, type LocalizedText, type MockLanguage } from '../../i18n'
import { activeLinks, vehiclePlates } from './links'
import { FLEET_MESSAGES } from './messages'

const REASON_TEXTS: Record<IneligibilityReason, LocalizedText> = {
  not_on_staff: FLEET_MESSAGES.reasonNotOnStaff,
  suspended: FLEET_MESSAGES.reasonSuspended,
  position_does_not_drive: FLEET_MESSAGES.reasonPositionDoesNotDrive,
  not_authorized: FLEET_MESSAGES.reasonNotAuthorized,
  on_leave: FLEET_MESSAGES.reasonOnLeave,
  documents: FLEET_MESSAGES.reasonDocuments
}

export function ineligibilityText(
  language: MockLanguage,
  reasons: readonly IneligibilityReason[]
): string {
  return reasons.map((reason) => localize(language, REASON_TEXTS[reason])).join(', ')
}

/** Employees whose job position involves driving: the fleet calls them drivers. */
export function driverEmployees(db: MockDatabase): EmployeeRow[] {
  const driving = new Set(
    db.jobPositions
      .all()
      .filter((position) => position.drives)
      .map((position) => position.no)
  )
  return db.employees.all().filter((employee) => driving.has(employee.jobPositionNo))
}

/** On leave by HR status, or covered on that day by an approved leave request. */
export function isOnLeave(db: MockDatabase, employee: EmployeeRow, day: string): boolean {
  if (employee.status === 'on_leave') return true
  return db.leaveRequests
    .all()
    .some(
      (request) =>
        request.employeeNo === employee.no &&
        request.status === 'approved' &&
        request.startDate <= day &&
        request.endDate >= day
    )
}

export function driverFacts(db: MockDatabase, employee: EmployeeRow, day: string): DriverFacts {
  const position = db.jobPositions.find(employee.jobPositionNo)
  return {
    onStaff: isOnStaff(employee.status),
    suspended: employee.status === 'suspended',
    positionDrives: !!position?.drives,
    drivingAuthorized: employee.drivingAuthorized,
    onLeave: isOnLeave(db, employee, day),
    documentsCompliant: null,
    onTrip: false,
    tripPlanned: false
  }
}

export function driversApi(db: MockDatabase, language: MockLanguage = 'fr'): DriverApi[] {
  const today = todayIso()
  const links = activeLinks(db)
  const plates = vehiclePlates(db)
  const positions = new Map(db.jobPositions.all().map((position) => [position.no, position.name]))
  const sites = new Map(db.sites.all().map((site) => [site.no, site.name]))
  const history = db.driverAssignments.all()

  return driverEmployees(db).map((employee) => {
    const facts = driverFacts(db, employee, today)
    const reasons = driverIneligibility(facts)
    const assignment = links.assignmentByDriver.get(employee.no)
    return {
      no: employee.no,
      fullName: employeeFullName(employee),
      jobPositionNo: employee.jobPositionNo,
      jobPositionName: positions.get(employee.jobPositionNo) ?? '',
      phone: employee.phone,
      siteCode: employee.siteCode,
      siteName: sites.get(employee.siteCode) ?? '',
      employeeStatus: employee.status,
      drivingAuthorized: employee.drivingAuthorized,
      vehicleNo: assignment?.vehicleNo ?? null,
      vehiclePlate: assignment ? (plates.get(assignment.vehicleNo) ?? '') : '',
      assignedSince: assignment?.startDate ?? null,
      availability: driverAvailability(facts),
      eligible: reasons.length === 0,
      ineligibilityReasons: ineligibilityText(language, reasons),
      assignments: history
        .filter((row) => row.employeeNo === employee.no)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((row) => ({
          no: row.no,
          vehicleNo: row.vehicleNo,
          vehiclePlate: plates.get(row.vehicleNo) ?? '',
          startDate: row.startDate,
          endDate: row.endDate
        })),
      modifiedAt: employee.modifiedAt,
      modifiedBy: employee.modifiedBy
    }
  })
}

export function registerDriversHandlers(router: MockRouter, db: MockDatabase): void {
  registerListResource(router, {
    basePath: '/fleet/drivers',
    feature: 'DRIVER',
    rows: (request) => driversApi(db, request.language),
    searchColumns: ['no', 'fullName', 'phone', 'vehiclePlate'],
    optionFields: { availability: 'driverAvailability', employeeStatus: 'employeeStatus' }
  })
}
