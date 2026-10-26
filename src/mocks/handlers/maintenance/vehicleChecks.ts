import {
  blockingAnomalies,
  CHECK_RESULTS,
  VEHICLE_CHECK_MOMENTS,
  vehicleCheckOutcome,
  type CheckPointResult,
  type CheckResult
} from '@/modules/maintenance/vehicle-checks/domain/vehicleCheck'
import type { VehicleCheckApi } from '@/modules/maintenance/vehicle-checks/types/vehicleCheck.types'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { registerCrudResource } from '../../http/crudResource'
import { invalidField, readDateTime, readEnum, readNumber, readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { sessionUser } from '../../http/types'
import { unprocessable } from '../../http/errors'
import type { MockRouter } from '../../http/router'
import { localize } from '../../i18n'
import { MAINTENANCE_MESSAGES } from './messages'
import { createWorkOrder } from './workOrders'

export function vehicleChecksApi(db: MockDatabase): VehicleCheckApi[] {
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  return db.vehicleChecks.all().map((row) => ({
    ...row,
    vehiclePlate: plates.get(row.vehicleNo) ?? row.vehicleNo,
    anomalyCount: row.results.filter((point) => point.result === 'anomaly').length,
    outcome: vehicleCheckOutcome(row.results)
  }))
}

/** Every active point of the moment answered, with its label and blocking flag frozen as they stand today. */
function readResults(
  db: MockDatabase,
  input: Record<string, unknown>,
  moment: (typeof VEHICLE_CHECK_MOMENTS)[number]
): CheckPointResult[] {
  const raw = input.results
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw invalidField('results')
  const answers = raw as Record<string, unknown>
  const points = db.vehicleCheckPoints
    .all()
    .filter((point) => point.active && point.moment === moment)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  if (!points.length) throw unprocessable(MAINTENANCE_MESSAGES.noCheckPoint)
  const missing = points.filter(
    (point) => !CHECK_RESULTS.includes(answers[point.no] as CheckResult)
  )
  if (missing.length) {
    throw unprocessable(MAINTENANCE_MESSAGES.checkPointsMissing, {
      points: missing.map((point) => point.label).join(', ')
    })
  }
  return points.map((point) => ({
    pointNo: point.no,
    label: point.label,
    blocking: point.blocking,
    result: answers[point.no] as CheckResult
  }))
}

export function registerVehicleChecksHandlers(router: MockRouter, db: MockDatabase): void {
  registerCrudResource(router, {
    basePath: '/maintenance/vehicle-checks',
    feature: 'VEHICLECHECK',
    collection: db.vehicleChecks,
    list: () => vehicleChecksApi(db),
    searchColumns: ['no', 'vehiclePlate'],
    optionFields: { moment: 'vehicleCheckMoment', outcome: 'vehicleCheckOutcome' },
    create: (input, request) => {
      const moment =
        readEnum(input, 'moment', VEHICLE_CHECK_MOMENTS, { required: true }) ?? 'before_loading'
      const vehicleNo = requireReference(db.vehicles, input, 'vehicleNo')
      const checkedAt = readDateTime(input, 'checkedAt', { required: true }) ?? nowIsoDateTime()
      if (checkedAt > nowIsoDateTime()) throw unprocessable(MAINTENANCE_MESSAGES.dateInFuture)
      const results = readResults(db, input, moment)
      const comment = readString(input, 'comment')
      const no = nextNo(
        db.vehicleChecks.all().map((row) => row.no),
        'CTL-',
        5
      )
      const blocking = blockingAnomalies(results)
      // The order is built first: if the vehicle cannot take one, the check is not recorded either.
      const order = blocking.length
        ? createWorkOrder(
            db,
            {
              vehicleNo,
              maintenanceType: 'corrective',
              severity: 'major',
              origin: 'vehicle_check',
              originNo: no,
              symptom: [
                localize(request.language, MAINTENANCE_MESSAGES.checkAnomalySymptom, {
                  points: blocking.map((point) => point.label).join(', ')
                }),
                comment
              ]
                .filter(Boolean)
                .join(' '),
              declaredAt: checkedAt
            },
            request
          )
        : null
      return {
        no,
        moment,
        vehicleNo,
        checkedAt,
        odometerKm: readNumber(input, 'odometerKm', { min: 0 }) ?? null,
        comment,
        results,
        checkedBy: sessionUser(request).code,
        workOrderNo: order?.no ?? null
      }
    },
    // A check is a record of what was seen: only its comment can be completed afterwards.
    update: (_existing, input) =>
      'comment' in input ? { comment: readString(input, 'comment') } : {}
  })
}
