import type {
  VehicleMaintenanceEntry,
  VehicleOwnershipCostApi
} from '@/modules/fleet/vehicles/types/vehicleRecords.types'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { routeParam } from '../../http/crudResource'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { vehicleCostApi } from '../maintenance/reliability'
import { workOrdersApi } from '../maintenance/workOrders'

/**
 * The maintenance log of a vehicle: its work orders and the plan operations done on it, newest
 * first. It is read from the maintenance records, never typed in twice.
 */
export function maintenanceLogApi(db: MockDatabase, vehicleNo: string): VehicleMaintenanceEntry[] {
  const operations = new Map(
    db.maintenancePlans
      .all()
      .flatMap((plan) => plan.operations)
      .map((operation) => [operation.no, operation.label])
  )
  const orders: VehicleMaintenanceEntry[] = workOrdersApi(db)
    .filter((order) => order.vehicleNo === vehicleNo)
    .map((order) => ({
      kind: 'work_order',
      no: order.no,
      date: (order.completedAt ?? order.declaredAt).slice(0, 10),
      label: order.workDone || order.symptom,
      maintenanceType: order.maintenanceType,
      status: order.status,
      km: order.odometerKmAtCompletion ?? order.odometerKmAtOpening,
      cost: order.status === 'cancelled' ? null : order.totalCost
    }))
  const passages: VehicleMaintenanceEntry[] = db.serviceRecords
    .all()
    .filter((record) => record.vehicleNo === vehicleNo)
    .map((record) => ({
      kind: 'service',
      no: record.no,
      date: record.date,
      label: operations.get(record.operationNo) ?? record.operationNo,
      maintenanceType: 'preventive',
      status: null,
      km: record.km,
      cost: null,
      workOrderNo: record.workOrderNo
    }))
  return [...orders, ...passages].sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * What the vehicle has cost since it entered the park: its acquisition plus everything the
 * maintenance, the tyres, the fuel and the insurance recorded for it, without any entry of its own.
 */
export function ownershipCostApi(db: MockDatabase, vehicleNo: string): VehicleOwnershipCostApi {
  const vehicle = db.vehicles.findOrFail(vehicleNo)
  const to = vehicle.removal?.date ?? todayIso()
  const from =
    vehicle.acquisitionDate ?? vehicle.firstRegistrationDate ?? vehicle.createdAt.slice(0, 10)
  const running = vehicleCostApi(db, vehicleNo, from <= to ? from : to, to)
  const acquisition = vehicle.acquisitionCost ?? 0
  const total = acquisition + running.total
  return {
    vehicleNo,
    from: running.from,
    to: running.to,
    km: running.km,
    acquisition,
    acquisitionKnown: vehicle.acquisitionCost !== null,
    maintenance: running.maintenance,
    fuel: running.fuel,
    tyres: running.tyres,
    insurance: running.insurance,
    total,
    costPerKm: running.km > 0 ? Math.round((total / running.km) * 100) / 100 : null,
    residualValue: vehicle.residualValue
  }
}

export function registerVehicleRecordsHandlers(router: MockRouter, db: MockDatabase): void {
  router.get(
    '/fleet/vehicles/:no/maintenance-log',
    { feature: 'WORKORDER', action: 'read' },
    (request) => {
      const vehicle = db.vehicles.findOrFail(routeParam(request, 'no'))
      return ok(maintenanceLogApi(db, vehicle.no))
    }
  )

  router.get(
    '/fleet/vehicles/:no/ownership-cost',
    { feature: 'RELIABILITY', action: 'read' },
    (request) => ok(ownershipCostApi(db, routeParam(request, 'no')))
  )
}
