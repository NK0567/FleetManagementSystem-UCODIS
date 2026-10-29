import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { readBody, stampCreated } from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import { readDateTime, readNumber } from '../../http/input'
import { requireReference } from '../../http/references'
import { created } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { MAINTENANCE_MESSAGES } from './messages'

/** Latest hour meter reading of each vehicle that has one. */
export function engineHoursByVehicle(db: MockDatabase): Map<string, number> {
  const latest = new Map<string, { hours: number; readAt: string }>()
  for (const row of db.engineHourReadings.all()) {
    const current = latest.get(row.vehicleNo)
    if (!current || row.readAt > current.readAt) latest.set(row.vehicleNo, row)
  }
  return new Map([...latest].map(([vehicleNo, row]) => [vehicleNo, row.hours]))
}

export function registerEngineHoursHandlers(router: MockRouter, db: MockDatabase): void {
  // A reading of the hour meter; it never goes back.
  router.post(
    '/maintenance/engine-hours',
    { feature: 'SERVICEDUE', action: 'insert' },
    (request) => {
      const body = readBody(request)
      const vehicleNo = requireReference(db.vehicles, body, 'vehicleNo')
      const hours = readNumber(body, 'hours', { required: true, min: 0 }) ?? 0
      const readAt = readDateTime(body, 'readAt') ?? nowIsoDateTime()
      if (readAt > nowIsoDateTime()) throw unprocessable(MAINTENANCE_MESSAGES.dateInFuture)
      const last = engineHoursByVehicle(db).get(vehicleNo)
      if (last !== undefined && hours < last) {
        throw unprocessable(MAINTENANCE_MESSAGES.hoursBackwards, { hours: last })
      }
      const row = db.engineHourReadings.insert(
        stampCreated(
          {
            no: nextNo(
              db.engineHourReadings.all().map((item) => item.no),
              'HRS-',
              5
            ),
            vehicleNo,
            hours,
            readAt,
            recordedBy: sessionUser(request).code
          },
          request
        )
      )
      return created(row)
    }
  )
}
