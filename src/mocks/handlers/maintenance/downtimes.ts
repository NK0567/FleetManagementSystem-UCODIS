import {
  dayCostOf,
  downtimeDays,
  downtimeStatus
} from '@/modules/maintenance/downtimes/domain/downtime'
import type { DowntimeApi } from '@/modules/maintenance/downtimes/types/downtime.types'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { DowntimeRow } from '../../fixtures/maintenance/downtimes'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDateTime, readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { MAINTENANCE_MESSAGES } from './messages'
import { maintenanceSettings } from './settings'

export function downtimesApi(db: MockDatabase): DowntimeApi[] {
  const now = nowIsoDateTime()
  const costs = maintenanceSettings(db).downtimeCost
  const codes = new Map(db.downtimeCodes.all().map((code) => [code.no, code]))
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
  const vehicles = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle]))
  return db.downtimes.all().map((row) => {
    const vehicle = vehicles.get(row.vehicleNo)
    const code = codes.get(row.downtimeCodeNo)
    const durationDays = downtimeDays(row.startedAt, row.endedAt, now)
    const motorized = !!types.get(vehicle?.vehicleTypeNo ?? '')?.motorized
    return {
      ...row,
      vehiclePlate: vehicle?.plate ?? row.vehicleNo,
      downtimeCodeName: code?.name ?? row.downtimeCodeNo,
      family: code?.family ?? 'technical',
      durationDays,
      cost: Math.round(durationDays * dayCostOf(motorized, costs)),
      status: downtimeStatus(row)
    }
  })
}

/** What keeps each vehicle out of service now: the causes of its open downtimes. */
export function openDowntimeCauses(db: MockDatabase): Map<string, string[]> {
  const codes = new Map(db.downtimeCodes.all().map((code) => [code.no, code.name]))
  const causes = new Map<string, string[]>()
  for (const row of db.downtimes.all().filter((downtime) => !downtime.endedAt)) {
    causes.set(row.vehicleNo, [
      ...(causes.get(row.vehicleNo) ?? []),
      codes.get(row.downtimeCodeNo) ?? row.downtimeCodeNo
    ])
  }
  return causes
}

function downtimeApiOf(db: MockDatabase, no: string) {
  return downtimesApi(db).find((row) => row.no === no)
}

export function registerDowntimesHandlers(router: MockRouter, db: MockDatabase): void {
  function readCode(input: Record<string, unknown>): string {
    const no = requireReference(db.downtimeCodes, input, 'downtimeCodeNo')
    if (!db.downtimeCodes.findOrFail(no).active) {
      throw unprocessable(MAINTENANCE_MESSAGES.downtimeCodeInactive)
    }
    return no
  }

  /** Several causes may keep a vehicle out at once, but not the same one twice. */
  function assertNoTwin(downtime: Pick<DowntimeRow, 'no' | 'vehicleNo' | 'downtimeCodeNo'>) {
    const twin = db.downtimes
      .all()
      .find(
        (row) =>
          row.no !== downtime.no &&
          !row.endedAt &&
          row.vehicleNo === downtime.vehicleNo &&
          row.downtimeCodeNo === downtime.downtimeCodeNo
      )
    if (twin) throw conflict(MAINTENANCE_MESSAGES.downtimeAlreadyOpen, { no: twin.no })
  }

  registerCrudResource(router, {
    basePath: '/maintenance/downtimes',
    feature: 'DOWNTIME',
    collection: db.downtimes,
    list: () => downtimesApi(db),
    searchColumns: ['no', 'vehiclePlate', 'downtimeCodeName'],
    optionFields: { family: 'downtimeFamily', status: 'downtimeStatus' },
    create: (input) => {
      const vehicleNo = requireReference(db.vehicles, input, 'vehicleNo')
      if (db.vehicles.findOrFail(vehicleNo).removal) {
        throw unprocessable(MAINTENANCE_MESSAGES.vehicleRemoved)
      }
      const startedAt = readDateTime(input, 'startedAt', { required: true }) ?? ''
      if (startedAt > nowIsoDateTime()) throw unprocessable(MAINTENANCE_MESSAGES.dateInFuture)
      const downtime = {
        no: nextNo(
          db.downtimes.all().map((row) => row.no),
          'IND-',
          5
        ),
        vehicleNo,
        downtimeCodeNo: readCode(input),
        origin: 'manual' as const,
        startedAt,
        comment: readString(input, 'comment'),
        endedAt: null,
        endedBy: null,
        endComment: ''
      }
      assertNoTwin(downtime)
      return downtime
    },
    // The cause can be corrected after the fact; the period is changed only by ending it.
    update: (existing, input) => {
      const patch = {
        ...('downtimeCodeNo' in input ? { downtimeCodeNo: readCode(input) } : {}),
        ...('comment' in input ? { comment: readString(input, 'comment') } : {})
      }
      if (!existing.endedAt) assertNoTwin({ ...existing, ...patch })
      return patch
    }
  })

  router.post(
    '/maintenance/downtimes/:no/end',
    { feature: 'DOWNTIME', action: 'update' },
    (request) => {
      const downtime = db.downtimes.findOrFail(routeParam(request, 'no'))
      if (downtime.endedAt) throw conflict(MAINTENANCE_MESSAGES.downtimeAlreadyEnded)
      if (downtime.origin === 'work_order') {
        throw conflict(MAINTENANCE_MESSAGES.downtimeHeldByWorkOrder)
      }
      const body = readBody(request)
      const now = nowIsoDateTime()
      const endedAt = readDateTime(body, 'endedAt') ?? now
      if (endedAt < downtime.startedAt || endedAt > now) {
        throw unprocessable(MAINTENANCE_MESSAGES.downtimeEndInvalid)
      }
      db.downtimes.update(downtime.no, {
        endedAt,
        endedBy: sessionUser(request).code,
        endComment: readString(body, 'comment'),
        ...stampModified(request)
      })
      return ok(downtimeApiOf(db, downtime.no))
    }
  )
}
