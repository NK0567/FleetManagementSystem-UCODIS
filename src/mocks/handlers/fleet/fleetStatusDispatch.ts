import type {
  FleetStatusApi,
  FleetStatusDispatchApi
} from '@/modules/fleet/fleet-status/types/fleetStatus.types'
import { isValidEmailAddress } from '@/modules/fleet/fleet-status/domain/fleetStatusDispatch'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { FleetStatusDispatchRow } from '../../fixtures/fleet/fleetStatus'
import { nextNo } from '../../db/numbering'
import { readBody, stampCreated, stampModified } from '../../http/crudResource'
import { notFound, unprocessable } from '../../http/errors'
import { readDate } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { localize, localizeDay, type MockLanguage } from '../../i18n'
import { SUPERVISION_MESSAGES } from './supervisionMessages'

const MAX_RECIPIENTS = 20
const LATEST_DISPATCHES = 10

const SUBJECT = { fr: 'État de flotte du {date}', en: 'Fleet status of {date}' }

/** Recipients typed in one field, separated by commas, semicolons or spaces, or sent as a list. */
function readRecipients(input: Record<string, unknown>): string[] {
  const raw = input.recipients
  const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,;\s]+/) : []
  return [...new Set(items.map((item) => String(item).trim().toLowerCase()).filter(Boolean))]
}

function dispatchesApi(db: MockDatabase): FleetStatusDispatchApi[] {
  return db.fleetStatusDispatches
    .all()
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, LATEST_DISPATCHES)
    .map(({ no, date, recipients, subject, lineCount, sentAt, sentBy }) => ({
      no,
      date,
      recipients,
      subject,
      lineCount,
      sentAt,
      sentBy
    }))
}

/**
 * Sending the fleet status by e-mail (FLT07-US02). There is no mail server in the demonstration:
 * the sending is recorded with its recipients and listed on the screen. Sending today's status
 * archives it, so the version sent can be read again from the list of days.
 */
export function registerFleetStatusDispatchHandlers(
  router: MockRouter,
  db: MockDatabase,
  liveLines: (language: MockLanguage) => FleetStatusApi[]
): void {
  router.get('/fleet/fleet-status/dispatches', { feature: 'FLEETSTATUS', action: 'read' }, () =>
    ok(dispatchesApi(db))
  )

  router.post(
    '/fleet/fleet-status/send',
    { feature: 'FLEETSTATUS', action: 'execute' },
    (request) => {
      const body = readBody(request)
      const today = todayIso()
      const date = readDate(body, 'date') ?? today
      const recipients = readRecipients(body)
      if (!recipients.length) throw unprocessable(SUPERVISION_MESSAGES.recipientsRequired)
      if (recipients.length > MAX_RECIPIENTS) {
        throw unprocessable(SUPERVISION_MESSAGES.tooManyRecipients, { max: MAX_RECIPIENTS })
      }
      const invalid = recipients.find((email) => !isValidEmailAddress(email))
      if (invalid) throw unprocessable(SUPERVISION_MESSAGES.recipientInvalid, { email: invalid })

      let lines: FleetStatusApi[]
      const archive = db.fleetStatusArchives.all().find((row) => row.date === date)
      if (date === today) {
        lines = liveLines(request.language)
        if (archive) db.fleetStatusArchives.update(archive.no, { lines, ...stampModified(request) })
        else {
          db.fleetStatusArchives.insert(
            stampCreated(
              {
                no: nextNo(
                  db.fleetStatusArchives.all().map((row) => row.no),
                  'ARC-',
                  5
                ),
                date,
                lines
              },
              request
            )
          )
        }
      } else if (archive) {
        lines = archive.lines
      } else {
        throw notFound(SUPERVISION_MESSAGES.fleetStatusDayUnknown)
      }

      const row = stampCreated<FleetStatusDispatchRow>(
        {
          no: nextNo(
            db.fleetStatusDispatches.all().map((dispatch) => dispatch.no),
            'ENV-',
            5
          ),
          date,
          recipients,
          subject: localize(request.language, SUBJECT, { date: localizeDay(date) }),
          lineCount: lines.length,
          sentAt: nowIsoDateTime(),
          sentBy: sessionUser(request).code
        },
        request
      )
      db.fleetStatusDispatches.insert(row)
      return ok(dispatchesApi(db).find((dispatch) => dispatch.no === row.no))
    }
  )
}
