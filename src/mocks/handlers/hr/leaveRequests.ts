import type {
  LeaveRequestApi,
  LeaveRequestSummary
} from '@/modules/hr/leave-requests/types/leaveRequest.types'
import {
  canDecide,
  decisionStatus,
  isDecisionCommentValid,
  MIN_DECISION_COMMENT_LENGTH,
  type LeaveRequestDecision
} from '@/modules/hr/leave-requests/domain/leaveRequestStatus'
import { isOnStaff } from '@/modules/hr/employees/domain/employee'
import { addDays, todayIso } from '@/utils/date'
import { ownRecordsOnly } from '../../auth/permissions'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { conflict, forbidden, unprocessable } from '../../http/errors'
import {
  readBody,
  registerCrudResource,
  registerListResource,
  routeParam,
  stampModified
} from '../../http/crudResource'
import { readDate, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { HR_MESSAGES } from './messages'
import { requireReference } from '../../http/references'
import { leaveBalancesApi, leaveRequestApi, leaveRequestsApi, workingDaysOf } from './views'

const DECISIONS: readonly LeaveRequestDecision[] = ['approve', 'send-back', 'reject']

/** Profiles limited to their own records only see the leave of the employee they are. */
function visibleTo<T extends { employeeNo: string }>(
  rows: T[],
  request: MockRequest,
  feature: string
): T[] {
  const user = sessionUser(request)
  if (!ownRecordsOnly(user.profile, feature)) return rows
  return rows.filter((row) => row.employeeNo === user.employeeNo)
}

export function registerLeaveHandlers(router: MockRouter, db: MockDatabase): void {
  /** Every check a new request goes through, in the order a user would fix them. */
  function checkNewRequest(
    request: MockRequest,
    employeeNo: string,
    leaveTypeNo: string,
    startDate: string,
    endDate: string
  ): void {
    const user = sessionUser(request)
    if (ownRecordsOnly(user.profile, 'LEAVEREQUEST') && employeeNo !== user.employeeNo) {
      throw forbidden(HR_MESSAGES.foreignEmployeeRequest)
    }
    const employee = db.employees.findOrFail(employeeNo)
    if (!isOnStaff(employee.status)) throw unprocessable(HR_MESSAGES.inactiveEmployee)
    const leaveType = db.leaveTypes.findOrFail(leaveTypeNo)
    if (!leaveType.active) throw unprocessable(HR_MESSAGES.inactiveLeaveType)
    if (endDate < startDate) throw unprocessable(HR_MESSAGES.invalidPeriod)
    if (leaveType.noticeDays > 0 && startDate < addDays(todayIso(), leaveType.noticeDays)) {
      throw unprocessable(HR_MESSAGES.noticeTooShort, { days: leaveType.noticeDays })
    }
    const days = workingDaysOf(db, startDate, endDate)
    if (days === 0) throw unprocessable(HR_MESSAGES.noWorkingDay)

    const overlaps = db.leaveRequests
      .all()
      .some(
        (other) =>
          other.employeeNo === employeeNo &&
          (other.status === 'pending' || other.status === 'approved') &&
          other.startDate <= endDate &&
          other.endDate >= startDate
      )
    if (overlaps) throw conflict(HR_MESSAGES.leaveOverlap)

    if (leaveType.tracksBalance) {
      const balance = leaveBalancesApi(db, Number(startDate.slice(0, 4))).find(
        (row) => row.employeeNo === employeeNo && row.leaveTypeNo === leaveTypeNo
      )
      const available = balance?.availableDays ?? 0
      if (days > available) throw unprocessable(HR_MESSAGES.insufficientBalance, { available })
    }
  }

  registerCrudResource(router, {
    basePath: '/hr/leave-requests',
    feature: 'LEAVEREQUEST',
    collection: db.leaveRequests,
    list: (request) => visibleTo(leaveRequestsApi(db), request, 'LEAVEREQUEST'),
    searchColumns: ['no', 'employeeName'],
    optionFields: { status: 'leaveRequestStatus' },
    create: (input, request) => {
      const employeeNo = requireReference(db.employees, input, 'employeeNo')
      const leaveTypeNo = requireReference(db.leaveTypes, input, 'leaveTypeNo')
      const startDate = readDate(input, 'startDate', { required: true }) ?? ''
      const endDate = readDate(input, 'endDate', { required: true }) ?? ''
      checkNewRequest(request, employeeNo, leaveTypeNo, startDate, endDate)
      return {
        no: nextNo(
          db.leaveRequests.all().map((row) => row.no),
          'LR-',
          4
        ),
        employeeNo,
        leaveTypeNo,
        startDate,
        endDate,
        status: 'pending' as const,
        reason: readString(input, 'reason'),
        submittedAt: nowIso(),
        decisionComment: '',
        decidedAt: null,
        decidedBy: null
      }
    }
  })

  router.get(
    '/hr/leave-requests/summary',
    { feature: 'LEAVEREQUEST', action: 'read' },
    (request) => {
      const today = todayIso()
      const month = today.slice(0, 7)
      const requests = visibleTo(leaveRequestsApi(db), request, 'LEAVEREQUEST')
      const approved = requests.filter((row) => row.status === 'approved')
      const summary: LeaveRequestSummary = {
        pending: requests.filter((row) => row.status === 'pending').length,
        approvedThisMonth: approved.filter(
          (row) => row.startDate.slice(0, 7) <= month && row.endDate.slice(0, 7) >= month
        ).length,
        absentToday: new Set(
          approved
            .filter((row) => row.startDate <= today && row.endDate >= today)
            .map((row) => row.employeeNo)
        ).size
      }
      return ok(summary)
    }
  )

  for (const decision of DECISIONS) {
    router.post(
      `/hr/leave-requests/:no/${decision}`,
      { feature: 'LEAVEREQUEST', action: 'execute' },
      (request) => {
        const row = db.leaveRequests.findOrFail(routeParam(request, 'no'))
        const user = sessionUser(request)
        if (row.employeeNo === user.employeeNo) throw forbidden(HR_MESSAGES.ownRequestDecision)
        if (!canDecide(row.status)) throw conflict(HR_MESSAGES.leaveNotPending)
        const comment = readString(readBody(request), 'comment')
        if (!isDecisionCommentValid(decision, comment)) {
          throw unprocessable(HR_MESSAGES.decisionCommentRequired, {
            min: MIN_DECISION_COMMENT_LENGTH
          })
        }
        const updated = db.leaveRequests.update(row.no, {
          status: decisionStatus(decision),
          decisionComment: comment,
          decidedAt: nowIso(),
          decidedBy: user.code,
          ...stampModified(request)
        })
        const record: LeaveRequestApi = leaveRequestApi(db, updated)
        return ok(record)
      }
    )
  }

  registerListResource(router, {
    basePath: '/hr/leave-balances',
    feature: 'LEAVEBALANCE',
    rows: (request) => visibleTo(leaveBalancesApi(db), request, 'LEAVEBALANCE'),
    searchColumns: ['employeeNo', 'employeeName']
  })
}
