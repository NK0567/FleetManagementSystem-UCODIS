import { needsService, serviceDue } from '@/modules/maintenance/service-due/domain/serviceDue'
import type { ServiceDueApi } from '@/modules/maintenance/service-due/types/serviceDue.types'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { readBody, registerListResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate, readNumber } from '../../http/input'
import { requireReference } from '../../http/references'
import { created } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { engineHoursByVehicle } from './engineHours'
import { planByVehicle } from './maintenancePlans'
import { MAINTENANCE_MESSAGES } from './messages'
import { lastPassages, recordPassages } from './serviceRecords'
import { maintenanceSettings } from './settings'
import { createWorkOrder, workOrdersApi } from './workOrders'

/** Every operation of every vehicle's active plan, where it stands today. */
export function serviceDueApi(db: MockDatabase): ServiceDueApi[] {
  const thresholds = maintenanceSettings(db).service
  const plans = planByVehicle(db)
  const last = lastPassages(db)
  const subsystems = new Map(db.failureCodes.all().map((code) => [code.no, code.name]))
  const today = todayIso()
  const hours = engineHoursByVehicle(db)
  const openOrders = db.workOrders.all().filter((order) => !order.validatedAt && !order.cancelledAt)
  return db.vehicles
    .all()
    .filter((vehicle) => !vehicle.removal && plans.has(vehicle.no))
    .flatMap((vehicle) => {
      const plan = plans.get(vehicle.no)!
      return plan.operations.map((operation) => {
        const passage = last.get(`${vehicle.no} ${operation.no}`) ?? null
        const currentHours = hours.get(vehicle.no) ?? null
        const due = serviceDue(
          operation,
          passage,
          { km: vehicle.odometerKm, today, hours: currentHours },
          thresholds,
          plan.provisional
        )
        return {
          no: `${vehicle.no}_${operation.no}`,
          vehicleNo: vehicle.no,
          vehiclePlate: vehicle.plate,
          planNo: plan.no,
          planName: plan.name,
          provisional: plan.provisional,
          operationNo: operation.no,
          operationLabel: operation.label,
          subsystemName: subsystems.get(operation.subsystemNo) ?? operation.subsystemNo,
          nature: operation.nature,
          intervalKm: operation.intervalKm,
          intervalHours: operation.intervalHours ?? null,
          intervalDays: operation.intervalDays,
          lastKm: passage?.km ?? null,
          lastHours: passage?.hours ?? null,
          lastDate: passage?.date ?? null,
          currentHours,
          ...due,
          openOrderNo:
            openOrders.find(
              (order) =>
                order.vehicleNo === vehicle.no && order.serviceOperationNos.includes(operation.no)
            )?.no ?? null
        }
      })
    })
}

/** The services past due on a confirmed plan: each makes its vehicle unavailable. */
export function blockingServiceCauses(db: MockDatabase): Map<string, string[]> {
  const causes = new Map<string, string[]>()
  for (const due of serviceDueApi(db).filter((row) => row.status === 'blocking')) {
    causes.set(due.vehicleNo, [...(causes.get(due.vehicleNo) ?? []), due.operationLabel])
  }
  return causes
}

export function registerServiceDueHandlers(router: MockRouter, db: MockDatabase): void {
  // Static paths first: they must not be read as a due item number.
  router.post(
    '/maintenance/service-due/passages',
    { feature: 'SERVICEDUE', action: 'insert' },
    (request) => {
      const body = readBody(request)
      const vehicle = db.vehicles.findOrFail(requireReference(db.vehicles, body, 'vehicleNo'))
      const plan = planByVehicle(db).get(vehicle.no)
      const operationNo = typeof body.operationNo === 'string' ? body.operationNo : ''
      if (!plan || !plan.operations.some((operation) => operation.no === operationNo)) {
        throw unprocessable(MAINTENANCE_MESSAGES.operationNotInPlan)
      }
      const date = readDate(body, 'date') ?? todayIso()
      if (date > todayIso()) throw unprocessable(MAINTENANCE_MESSAGES.dateInFuture)
      const km =
        body.km == null || body.km === '' ? null : (readNumber(body, 'km', { min: 0 }) ?? null)
      if (km !== null && km > vehicle.odometerKm) {
        throw unprocessable(MAINTENANCE_MESSAGES.passageBeyondOdometer, { km: vehicle.odometerKm })
      }
      const hours =
        body.hours == null || body.hours === ''
          ? null
          : (readNumber(body, 'hours', { min: 0 }) ?? null)
      const currentHours = engineHoursByVehicle(db).get(vehicle.no)
      if (hours !== null && (currentHours === undefined || hours > currentHours)) {
        throw unprocessable(MAINTENANCE_MESSAGES.passageBeyondHours, { hours: currentHours ?? 0 })
      }
      recordPassages(
        db,
        [{ vehicleNo: vehicle.no, operationNo, km, hours, date, workOrderNo: null }],
        request
      )
      return created(serviceDueApi(db).find((row) => row.no === `${vehicle.no}_${operationNo}`))
    }
  )

  // One preventive order per vehicle bundles every operation due soon or overdue.
  router.post(
    '/maintenance/service-due/work-order',
    { feature: 'WORKORDER', action: 'insert' },
    (request) => {
      const vehicleNo = requireReference(db.vehicles, readBody(request), 'vehicleNo')
      const due = serviceDueApi(db).filter((row) => row.vehicleNo === vehicleNo)
      const openOrderNo = due.find((row) => row.openOrderNo)?.openOrderNo
      if (openOrderNo) throw conflict(MAINTENANCE_MESSAGES.serviceOrderOpen, { no: openOrderNo })
      const operations = due.filter((row) => needsService(row.status))
      if (!operations.length) throw unprocessable(MAINTENANCE_MESSAGES.nothingDue)
      const order = createWorkOrder(
        db,
        {
          vehicleNo,
          maintenanceType: 'preventive',
          severity: 'minor',
          origin: 'preventive',
          originNo: operations[0]?.planNo ?? null,
          symptom: operations.map((row) => row.operationLabel).join(' ; '),
          declaredAt: nowIsoDateTime(),
          serviceOperationNos: operations.map((row) => row.operationNo)
        },
        request
      )
      return created(workOrdersApi(db).find((row) => row.no === order.no))
    }
  )

  registerListResource(router, {
    basePath: '/maintenance/service-due',
    feature: 'SERVICEDUE',
    rows: () => serviceDueApi(db),
    searchColumns: ['vehiclePlate', 'operationLabel', 'planName'],
    optionFields: { status: 'serviceDueStatus', nature: 'operationNature' }
  })
}
