import { decisionBlock } from '@/modules/fleet/company-documents/domain/companyDocument'
import type { InboxApi, InboxRequest } from '@/modules/fleet/alerts/types/alert.types'
import { canDecide } from '@/modules/hr/leave-requests/domain/leaveRequestStatus'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import type { PermissionAction } from '@/types/auth.types'
import { disabledFeatures, hasPermission, permissionsFor } from '../../auth/permissions'
import type { MockDatabase } from '../../db/database'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { alertsApi } from './alerts'

const SHOWN = 8

/**
 * The bell: the user's open alerts (new or taken in hand) and the requests waiting for a decision
 * he may take. Each list follows the rights of the user; nothing is shown that he could not open.
 */
export function inboxApi(db: MockDatabase, request: MockRequest): InboxApi {
  const user = sessionUser(request)
  const rights = permissionsFor(user.profile, disabledFeatures(db.moduleToggles.all()))
  const may = (feature: string, action: PermissionAction) => hasPermission(rights, feature, action)

  const alerts = may('ALERT', 'read')
    ? alertsApi(db, request)
        .filter((alert) => alert.status === 'new' || alert.status === 'acknowledged')
        .sort((a, b) => b.since.localeCompare(a.since))
    : []

  const requests: InboxRequest[] = []
  if (may('LEAVEREQUEST', 'execute')) {
    const names = new Map(db.employees.all().map((row) => [row.no, employeeFullName(row)]))
    for (const leave of db.leaveRequests.all()) {
      if (!canDecide(leave.status) || leave.employeeNo === user.employeeNo) continue
      requests.push({
        kind: 'leave',
        no: leave.no,
        subject: names.get(leave.employeeNo) ?? leave.employeeNo,
        since: leave.submittedAt,
        path: '/hr/leave-requests'
      })
    }
  }
  if (may('COMPANYDOCUMENT', 'execute')) {
    for (const document of db.companyDocuments.all()) {
      if (decisionBlock(document, user.code)) continue
      requests.push({
        kind: 'companyDocument',
        no: document.no,
        subject: document.name,
        since: document.createdAt,
        path: '/fleet/company-documents'
      })
    }
  }
  if (may('DEPARTUREAUTHORIZATION', 'execute')) {
    for (const authorization of db.departureAuthorizations.all()) {
      if (authorization.decision !== 'pending') continue
      requests.push({
        kind: 'departure',
        no: authorization.no,
        subject: authorization.tripNo,
        since: authorization.createdAt,
        path: '/fleet/departure-authorizations'
      })
    }
  }
  requests.sort((a, b) => b.since.localeCompare(a.since))

  return {
    alertCount: alerts.length,
    alerts: alerts.slice(0, SHOWN),
    requestCount: requests.length,
    requests: requests.slice(0, SHOWN)
  }
}

export function registerInboxHandlers(router: MockRouter, db: MockDatabase): void {
  // Every signed-in user has a bell; what it holds depends on his rights.
  router.get('/inbox', {}, (request) => ok(inboxApi(db, request)))
}
