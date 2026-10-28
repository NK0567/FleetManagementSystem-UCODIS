import type { DashboardLeave, HrDashboardApi } from '@/modules/hr/dashboard/types/hrDashboard.types'
import type { MyPlanningApi } from '@/modules/hr/my-planning/types/myPlanning.types'
import { buildWeekPlanning } from '@/modules/hr/my-planning/domain/weekPlanning'
import { isOnStaff } from '@/modules/hr/employees/domain/employee'
import { addDays, isIsoDay, startOfIsoWeek, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { invalidField } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { WORKING_CALENDAR_NO } from '../../fixtures/hr/calendar'
import { employeesApi, jobPositionsApi, leaveRequestsApi, orgUnitsApi } from './views'

const LIST_SIZE = 5
const UPCOMING_DAYS = 14

function toDashboardLeave(request: DashboardLeave): DashboardLeave {
  const { no, employeeNo, employeeName, leaveTypeName, startDate, endDate, days, status } = request
  return { no, employeeNo, employeeName, leaveTypeName, startDate, endDate, days, status }
}

export function registerDashboardHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/hr/dashboard', { feature: 'HRDASHBOARD', action: 'read' }, () => {
    const today = todayIso()
    const month = today.slice(0, 7)
    const horizon = addDays(today, UPCOMING_DAYS)
    const staff = employeesApi(db).filter((employee) => isOnStaff(employee.status))
    const requests = leaveRequestsApi(db)
    const approved = requests.filter((request) => request.status === 'approved')
    const pending = requests
      .filter((request) => request.status === 'pending')
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))

    const dashboard: HrDashboardApi = {
      headcount: {
        onStaff: staff.length,
        drivers: staff.filter((employee) => employee.drives).length,
        onLeave: staff.filter((employee) => employee.status === 'on_leave').length,
        suspended: staff.filter((employee) => employee.status === 'suspended').length
      },
      leave: {
        pending: pending.length,
        approvedThisMonth: approved.filter(
          (request) =>
            request.startDate.slice(0, 7) <= month && request.endDate.slice(0, 7) >= month
        ).length,
        absentToday: new Set(
          approved
            .filter((request) => request.startDate <= today && request.endDate >= today)
            .map((request) => request.employeeNo)
        ).size,
        pendingRequests: pending.slice(0, LIST_SIZE).map(toDashboardLeave),
        upcoming: approved
          .filter((request) => request.endDate >= today && request.startDate <= horizon)
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .slice(0, LIST_SIZE)
          .map(toDashboardLeave)
      },
      attention: {
        pendingOrgUnits: db.orgUnits
          .all()
          .filter((unit) => unit.status === 'pending_validation')
          .map(({ no, name }) => ({ no, name })),
        unauthorizedDrivers: staff
          .filter((employee) => employee.drives && !employee.drivingAuthorized)
          .map(({ no, fullName }) => ({ no, fullName })),
        understaffedPositions: jobPositionsApi(db)
          .filter((position) => position.headcountGap > 0)
          .map(({ no, name, headcountGap }) => ({ no, name, headcountGap }))
      },
      headcountByUnit: orgUnitsApi(db)
        .filter((unit) => unit.headcount > 0)
        .sort((a, b) => b.headcount - a.headcount)
        .map(({ no, name, headcount }) => ({ no, name, headcount }))
    }
    return ok(dashboard)
  })

  /** The week of the signed-in user: company hours, holidays and their own leave. */
  router.get('/hr/my-planning', { feature: 'MYPLANNING', action: 'read' }, (request) => {
    const requested = typeof request.query.weekStart === 'string' ? request.query.weekStart : ''
    if (requested && !isIsoDay(requested)) throw invalidField('weekStart')
    const weekStart = startOfIsoWeek(requested || todayIso())
    const user = sessionUser(request)
    const employee = user.employeeNo ? db.employees.find(user.employeeNo) : undefined
    const calendar = db.workingCalendar.find(WORKING_CALENDAR_NO)?.days ?? []
    const ownLeave = employee
      ? leaveRequestsApi(db).filter((leave) => leave.employeeNo === employee.no)
      : []
    const planning: MyPlanningApi = {
      weekStart,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : user.name,
      days: buildWeekPlanning(weekStart, calendar, db.publicHolidays.all(), ownLeave)
    }
    return ok(planning)
  })
}
