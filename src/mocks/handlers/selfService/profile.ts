import { driverIneligibility } from '@/modules/fleet/drivers/domain/driver'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { mayDeclare, type FieldRole } from '@/modules/self-service/domain/myspace'
import type { UserProfileCode } from '@/types/auth.types'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { notFound } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockLanguage } from '../../i18n'
import type { MockSessionUser } from '../../http/types'
import { documentCompliance, gapsText } from '../fleet/documentCompliance'
import { documentsApi } from '../fleet/documents'
import { driverFacts, ineligibilityText } from '../fleet/drivers'
import { leaveBalancesApi } from '../hr/views'
import { fleetSettings } from '../fleet/settings'
import { SELF_SERVICE_MESSAGES } from './messages'

function fieldRole(profile: UserProfileCode): FieldRole {
  return profile === 'DRIVER' ? 'driver' : 'assistant'
}

export function myProfile(db: MockDatabase, user: MockSessionUser, language: MockLanguage) {
  const employee = user.employeeNo ? db.employees.find(user.employeeNo) : undefined
  if (!employee) throw notFound(SELF_SERVICE_MESSAGES.noEmployee)
  const today = todayIso()
  const facts = driverFacts(db, employee, today)
  const reasons = driverIneligibility(facts)
  const gaps = documentCompliance(db).persons.get(employee.no) ?? []
  const position = db.jobPositions.find(employee.jobPositionNo)
  const site = db.sites.find(employee.siteCode)
  const driving = fleetSettings(db).drivingTime
  return {
    employeeNo: employee.no,
    fullName: employeeFullName(employee),
    phone: employee.phone,
    jobPositionName: position?.name ?? '',
    // What the position asks of him, from the HR positions (v57 « Ce que j'ai à faire »).
    responsibilities: position?.responsibilities ?? [],
    // The driving limits in force, from the fleet driving-time settings, for whoever drives.
    drivingLimits:
      user.profile === 'DRIVER'
        ? {
            dailyDrivingMaxMin: driving.dailyDrivingMaxMin,
            dailyRestMinH: driving.restBeforeDepartureMinH,
            weeklyDrivingMaxH: driving.weeklyDrivingMaxH
          }
        : null,
    siteName: site?.name ?? '',
    status: employee.status,
    mayDeclare: mayDeclare(fieldRole(user.profile)),
    eligible: reasons.length === 0,
    ineligibilityReasons: ineligibilityText(language, reasons),
    documentGaps: gapsText(db, gaps, language),
    documents: documentsApi(db)
      .filter(
        (document) =>
          document.target === 'person' && document.subjectNo === employee.no && document.current
      )
      .map((document) => ({
        no: document.no,
        name: document.documentTypeName,
        number: document.number,
        expiryDate: document.expiryDate,
        state: document.state
      })),
    leaveTypes: db.leaveTypes
      .all()
      .filter((type) => type.active)
      .map((type) => ({ no: type.no, name: type.name })),
    balances: leaveBalancesApi(db)
      .filter((balance) => balance.employeeNo === employee.no)
      .map((balance) => ({
        leaveTypeNo: balance.leaveTypeNo,
        leaveTypeName: balance.leaveTypeName,
        remainingDays: balance.remainingDays,
        availableDays: balance.availableDays
      }))
  }
}

export function registerSelfServiceHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/me', { feature: 'MYSPACE' }, (request) => {
    if (!request.user) throw notFound(SELF_SERVICE_MESSAGES.noEmployee)
    return ok(myProfile(db, request.user, request.language))
  })
}
