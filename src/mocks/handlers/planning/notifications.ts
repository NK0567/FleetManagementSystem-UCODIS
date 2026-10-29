import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { NotificationRow } from '../../fixtures/planning/notifications'
import { seedAudit } from '../../fixtures/seedAudit'
import { notFound } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'

/** Records a notification for a driver; the driver reads it in his space. */
export function notifyDriver(
  db: MockDatabase,
  employeeNo: string | null | undefined,
  kind: NotificationRow['kind'],
  orderNo: string,
  detail = ''
): void {
  if (!employeeNo) return
  const no = nextNo(
    db.notifications.all().map((row) => row.no),
    'NTF-',
    5
  )
  db.notifications.insert({
    no,
    employeeNo,
    at: nowIsoDateTime(),
    kind,
    orderNo,
    detail,
    readAt: null,
    ...seedAudit
  })
}

export function registerNotificationHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/me/notifications', { feature: 'MYSPACE', action: 'read' }, (request) => {
    const user = sessionUser(request)
    if (!user.employeeNo) return ok([])
    return ok(
      db.notifications
        .all()
        .filter((row) => row.employeeNo === user.employeeNo)
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 20)
    )
  })
  router.post('/me/notifications/read', { feature: 'MYSPACE', action: 'execute' }, (request) => {
    const user = sessionUser(request)
    if (!user.employeeNo) throw notFound()
    const at = nowIsoDateTime()
    for (const row of db.notifications.all()) {
      if (row.employeeNo === user.employeeNo && !row.readAt)
        db.notifications.update(row.no, { readAt: at })
    }
    return ok({ read: true })
  })
}
