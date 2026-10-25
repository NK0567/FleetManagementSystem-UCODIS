import { dayCostOf, downtimeDaysWithin } from '@/modules/maintenance/downtimes/domain/downtime'
import {
  kmInPeriod,
  reliabilityKpis,
  type OdometerPoint
} from '@/modules/maintenance/reliability/domain/reliability'
import type {
  MaintenanceDashboardApi,
  ReliabilityApi
} from '@/modules/maintenance/reliability/types/reliability.types'
import { isWorkable } from '@/modules/maintenance/work-orders/domain/workOrder'
import { addDays, daysBetween, nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { openDowntimeCauses } from './downtimes'
import { purchaseRequestsApi } from './purchaseRequests'
import { serviceDueApi } from './serviceDue'
import { maintenanceSettings } from './settings'
import { stockItemsApi } from './stockItems'
import { tyresApi } from './tyres'
import { workOrdersApi } from './workOrders'

/** Every km reading of each vehicle, whatever record carries it. */
export function odometerPoints(db: MockDatabase): Map<string, OdometerPoint[]> {
  const points = new Map<string, OdometerPoint[]>()
  const add = (vehicleNo: string, at: string | null, km: number | null) => {
    if (!at || km === null) return
    points.set(vehicleNo, [...(points.get(vehicleNo) ?? []), { at, km }])
  }
  for (const vehicle of db.vehicles.all()) {
    for (const reading of vehicle.odometerReadings) add(vehicle.no, reading.readAt, reading.km)
  }
  for (const refill of db.fuelRefills.all())
    add(refill.vehicleNo, refill.refueledAt, refill.odometerKm)
  for (const trip of db.trips.all()) {
    add(trip.vehicleNo, trip.actualDeparture, trip.startOdometerKm)
    add(trip.vehicleNo, trip.actualArrival, trip.endOdometerKm)
  }
  for (const order of db.workOrders.all().filter((row) => row.origin !== 'history')) {
    add(order.vehicleNo, order.declaredAt, order.odometerKmAtOpening)
    add(order.vehicleNo, order.completedAt, order.odometerKmAtCompletion)
  }
  return points
}

const top = <T>(entries: Map<string, T>, value: (item: T) => number, count = 5) =>
  [...entries].sort((a, b) => value(b[1]) - value(a[1])).slice(0, count)

export function reliabilityApi(db: MockDatabase, from: string, to: string): ReliabilityApi {
  const fromAt = `${from}T00:00:00`
  const toAt = `${to}T23:59:59`
  const now = nowIsoDateTime()
  const orders = workOrdersApi(db)
  const vehicles = db.vehicles.all().filter((vehicle) => !vehicle.removal)
  const points = odometerPoints(db)
  const kmByVehicle = new Map(
    vehicles.map((vehicle) => [vehicle.no, kmInPeriod(points.get(vehicle.no) ?? [], fromAt, toAt)])
  )
  const costs = maintenanceSettings(db).downtimeCost
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
  const families = new Map(db.downtimeCodes.all().map((code) => [code.no, code.family]))
  const vehicleOf = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle]))
  const lostByFamily = new Map<string, { days: number; cost: number }>()
  const lostByVehicle = new Map<string, number>()
  for (const downtime of db.downtimes.all()) {
    const days = downtimeDaysWithin(downtime.startedAt, downtime.endedAt, now, fromAt, toAt)
    if (!days) continue
    const vehicle = vehicleOf.get(downtime.vehicleNo)
    const motorized = !!types.get(vehicle?.vehicleTypeNo ?? '')?.motorized
    const family = families.get(downtime.downtimeCodeNo) ?? 'technical'
    const current = lostByFamily.get(family) ?? { days: 0, cost: 0 }
    lostByFamily.set(family, {
      days: current.days + days,
      cost: current.cost + Math.round(days * dayCostOf(motorized, costs))
    })
    lostByVehicle.set(downtime.vehicleNo, (lostByVehicle.get(downtime.vehicleNo) ?? 0) + days)
  }
  const lostDays = [...lostByVehicle.values()].reduce((total, days) => total + days, 0)
  const periodDays = Math.max(1, daysBetween(from, to) + 1)

  const failures = orders.filter(
    (order) =>
      order.status !== 'cancelled' &&
      order.origin !== 'history' &&
      order.maintenanceType === 'corrective' &&
      order.declaredAt >= fromAt &&
      order.declaredAt <= toAt
  )
  const count = (key: (order: (typeof failures)[number]) => string | null) => {
    const counts = new Map<string, number>()
    for (const order of failures) {
      const name = key(order)
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return counts
  }
  const byVehicle = new Map<string, { failures: number; cost: number }>()
  for (const order of orders.filter(
    (row) =>
      row.status !== 'cancelled' &&
      row.validatedAt &&
      row.validatedAt >= fromAt &&
      row.validatedAt <= toAt
  )) {
    const current = byVehicle.get(order.vehiclePlate) ?? { failures: 0, cost: 0 }
    byVehicle.set(order.vehiclePlate, { ...current, cost: current.cost + order.totalCost })
  }
  for (const order of failures) {
    const current = byVehicle.get(order.vehiclePlate) ?? { failures: 0, cost: 0 }
    byVehicle.set(order.vehiclePlate, { ...current, failures: current.failures + 1 })
  }

  return {
    from,
    to,
    kpis: reliabilityKpis({
      orders: orders.map((order) => ({
        maintenanceType: order.maintenanceType,
        imported: order.origin === 'history',
        cancelled: order.status === 'cancelled',
        declaredAt: order.declaredAt,
        completedAt: order.completedAt,
        validatedAt: order.validatedAt,
        totalCost: order.totalCost
      })),
      fleetKm: [...kmByVehicle.values()].reduce((total, km) => total + km, 0),
      lostDays,
      vehicleDays: vehicles.length * periodDays,
      from: fromAt,
      to: toAt
    }),
    bySubsystem: top(
      count((order) => order.subsystemName || null),
      (n) => n,
      10
    ).map(([name, failuresCount]) => ({ name, count: failuresCount })),
    byMode: top(
      count((order) => order.modeName || null),
      (n) => n
    ).map(([name, n]) => ({
      name,
      count: n
    })),
    byCause: top(
      count((order) => order.causeName || null),
      (n) => n
    ).map(([name, n]) => ({
      name,
      count: n
    })),
    lostDaysByFamily: [...lostByFamily].map(([family, value]) => ({
      family,
      days: Math.round(value.days * 100) / 100,
      cost: value.cost
    })),
    topVehicles: top(byVehicle, (value) => value.failures * 1e12 + value.cost).map(
      ([plate, value]) => ({ plate, ...value })
    )
  }
}

export function maintenanceDashboardApi(db: MockDatabase): MaintenanceDashboardApi {
  const orders = workOrdersApi(db)
  const today = todayIso()
  return {
    openOrders: orders.filter((order) => isWorkable(order.status)).length,
    awaitingValidation: orders.filter((order) => order.status === 'awaiting_validation').length,
    awaitingParts: orders.filter((order) => isWorkable(order.status) && order.pendingPartCount > 0)
      .length,
    atOutsideGarage: orders.filter((order) => order.external && !order.external.returnedAt).length,
    unavailableVehicles: openDowntimeCauses(db).size,
    servicesToPlan: serviceDueApi(db).filter(
      (due) => due.status === 'due_soon' || due.status === 'overdue' || due.status === 'blocking'
    ).length,
    blockingServices: serviceDueApi(db).filter((due) => due.status === 'blocking').length,
    lowStockItems: stockItemsApi(db).filter((item) => item.active && item.status !== 'available')
      .length,
    pendingPurchases: purchaseRequestsApi(db).filter(
      (request) => request.status === 'requested' || request.status === 'ordered'
    ).length,
    tyreAlerts: tyresApi(db).filter((tyre) => tyre.alert === 'safety').length,
    last30Days: reliabilityApi(db, addDays(today, -29), today).kpis
  }
}

const isDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

export function registerReliabilityHandlers(router: MockRouter, db: MockDatabase): void {
  router.get(
    '/maintenance/reliability',
    { feature: 'RELIABILITY', action: 'read' },
    (request: MockRequest) => {
      const today = todayIso()
      const to = isDay(request.query.to) ? request.query.to : today
      const from = isDay(request.query.from) ? request.query.from : addDays(to, -364)
      return ok(reliabilityApi(db, from <= to ? from : to, to))
    }
  )

  router.get('/maintenance/dashboard', { feature: 'MAINTENANCEDASHBOARD', action: 'read' }, () =>
    ok(maintenanceDashboardApi(db))
  )
}
