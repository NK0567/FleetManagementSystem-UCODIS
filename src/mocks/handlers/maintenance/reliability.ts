import { dayCostOf, downtimeDaysWithin } from '@/modules/maintenance/downtimes/domain/downtime'
import {
  kmAt,
  kmInPeriod,
  ownershipCost,
  premiumShare,
  reliabilityKpis,
  type OdometerPoint
} from '@/modules/maintenance/reliability/domain/reliability'
import type {
  MaintenanceDashboardApi,
  MaintenanceSteering,
  ReliabilityApi,
  VehicleCostApi
} from '@/modules/maintenance/reliability/types/reliability.types'
import { isWorkable } from '@/modules/maintenance/work-orders/domain/workOrder'
import { addDays, daysBetween, nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { routeParam } from '../../http/crudResource'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { openDowntimeCauses } from './downtimes'
import { purchaseRequestsApi } from './purchaseRequests'
import { serviceDueApi } from './serviceDue'
import { maintenanceSettings, maintenanceTargets } from './settings'
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

  const fleetKm = [...kmByVehicle.values()].reduce((total, km) => total + km, 0)
  const mobileTypes = new Map(db.missionTypes.all().map((type) => [type.no, type.isControl]))
  // A breakdown handled on the road: a mobile team call that opened no order, or the order it opened.
  const roadCalls = db.mobileInterventions
    .all()
    .filter(
      (call) =>
        mobileTypes.get(call.missionTypeNo) === false &&
        !call.workOrderNo &&
        call.departedAt >= fromAt &&
        call.departedAt <= toAt
    ).length
  const roadOrders = failures.filter((order) => order.origin === 'mobile_team').length
  const road = roadCalls + roadOrders
  const workshop = failures.length - roadOrders
  const plates = new Map(vehicles.map((vehicle) => [vehicle.no, vehicle.plate]))

  return {
    from,
    to,
    mtbfBySubsystem: top(
      count((order) => order.subsystemName || null),
      (n) => n,
      20
    ).map(([name, failuresCount]) => ({
      name,
      failures: failuresCount,
      mtbfKm: fleetKm ? Math.round(fleetKm / failuresCount) : null
    })),
    breakdownPlace: {
      road,
      workshop,
      roadShare: road + workshop ? Math.round((road * 100) / (road + workshop)) : null
    },
    lostDaysPer10000Km: [...lostByVehicle]
      .map(([vehicleNo, days]) => {
        const km = kmByVehicle.get(vehicleNo) ?? 0
        return {
          plate: plates.get(vehicleNo) ?? vehicleNo,
          km,
          lostDays: Math.round(days * 100) / 100,
          ratio: km ? Math.round(((days * 10_000) / km) * 100) / 100 : null
        }
      })
      .filter((row) => row.km > 0)
      .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0)),
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
      fleetKm,
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
    ),
    ...maintenanceSteering(db, orders, fromAt, toAt, lostByFamily)
  }
}

/**
 * What the maintenance manager steers the park with (FLT07-US03): the workload of the workshop
 * today, how much of the preventive work was done, preventive against corrective cost, days lost
 * to people against days lost to the machines, and the targets they are read against.
 */
function maintenanceSteering(
  db: MockDatabase,
  orders: ReturnType<typeof workOrdersApi>,
  fromAt: string,
  toAt: string,
  lostByFamily: Map<string, { days: number; cost: number }>
): MaintenanceSteering {
  const today = todayIso()
  const live = orders.filter((order) => order.status !== 'cancelled')
  const workable = live.filter((order) => isWorkable(order.status))
  const plannedFor = (order: (typeof orders)[number]) => order.planning?.date ?? null
  const preventive = live.filter(
    (order) =>
      order.maintenanceType === 'preventive' &&
      order.origin !== 'history' &&
      order.declaredAt >= fromAt &&
      order.declaredAt <= toAt
  )
  // Services past their due point with no order opened for them: due, and not done.
  const missed = serviceDueApi(db).filter(
    (due) => (due.status === 'overdue' || due.status === 'blocking') && !due.openOrderNo
  ).length
  const done = preventive.filter((order) => order.completedAt).length
  const validated = live.filter(
    (order) => order.validatedAt && order.validatedAt >= fromAt && order.validatedAt <= toAt
  )
  const costOf = (type: string) =>
    validated
      .filter((order) => order.maintenanceType === type)
      .reduce((total, order) => total + order.totalCost, 0)
  const human = lostByFamily.get('human')?.days ?? 0
  const technical = lostByFamily.get('technical')?.days ?? 0
  const round = (value: number) => Math.round(value * 100) / 100
  return {
    workload: {
      inProgress: workable.filter((order) => order.status === 'in_progress').length,
      planned: workable.filter((order) => {
        const date = plannedFor(order)
        return order.status !== 'in_progress' && !!date && date >= today
      }).length,
      late: workable.filter((order) => {
        const date = plannedFor(order)
        return !!date && date < today
      }).length
    },
    preventiveCompletion: {
      due: preventive.length + missed,
      done,
      missedServices: missed,
      rate:
        preventive.length + missed ? Math.round((done * 100) / (preventive.length + missed)) : null
    },
    costByType: {
      preventive: costOf('preventive'),
      corrective: costOf('corrective'),
      improvement: costOf('improvement')
    },
    lostDaysByCause: {
      human: round(human),
      technical: round(technical),
      ratio: technical ? round(human / technical) : null
    },
    targets: maintenanceTargets(db)
  }
}

export function maintenanceDashboardApi(db: MockDatabase): MaintenanceDashboardApi {
  const orders = workOrdersApi(db)
  const today = todayIso()
  const last30 = reliabilityApi(db, addDays(today, -29), today)
  return {
    workload: last30.workload,
    preventiveCompletion: last30.preventiveCompletion,
    targets: last30.targets,
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
    last30Days: last30.kpis
  }
}

/** What running a vehicle cost over a period, by item; acquisition is shown apart. */
export function vehicleCostApi(
  db: MockDatabase,
  vehicleNo: string,
  from: string,
  to: string
): VehicleCostApi {
  const vehicle = db.vehicles.findOrFail(vehicleNo)
  const fromAt = `${from}T00:00:00`
  const toAt = `${to}T23:59:59`
  const points = odometerPoints(db).get(vehicleNo) ?? []
  const within = (at: string | null) => !!at && at >= fromAt && at <= toAt
  const maintenance = workOrdersApi(db)
    .filter(
      (order) =>
        order.vehicleNo === vehicleNo && order.status !== 'cancelled' && within(order.validatedAt)
    )
    .reduce((total, order) => total + order.totalCost, 0)
  const fuel = Math.round(
    db.fuelRefills
      .all()
      .filter((refill) => refill.vehicleNo === vehicleNo && within(refill.refueledAt))
      .reduce((total, refill) => total + refill.liters * refill.unitPrice, 0)
  )
  // A tyre costs, per km run on this vehicle in the period, what it costs per km over its life.
  const tyres = Math.round(
    tyresApi(db).reduce((total, tyre) => {
      if (!tyre.costPerKm) return total
      const km = tyre.stints
        .filter((stint) => stint.vehicleNo === vehicleNo)
        .reduce((sum, stint) => {
          const start = stint.mountedAt > fromAt ? stint.mountedAt : fromAt
          const endAt = stint.dismountedAt && stint.dismountedAt < toAt ? stint.dismountedAt : toAt
          if (endAt <= start) return sum
          return sum + Math.max(0, (kmAt(points, endAt) ?? 0) - (kmAt(points, start) ?? 0))
        }, 0)
      return total + km * tyre.costPerKm
    }, 0)
  )
  const insurance = db.insurancePolicies
    .all()
    .filter((policy) => policy.vehicleNo === vehicleNo && policy.annualPremium)
    .reduce((total, policy) => total + premiumShare(policy.annualPremium ?? 0, policy, from, to), 0)
  const km = kmInPeriod(points, fromAt, toAt)
  return {
    vehicleNo,
    from,
    to,
    km,
    acquisitionCost: vehicle.acquisitionCost,
    ...ownershipCost({ maintenance, fuel, tyres, insurance }, km)
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

  router.get(
    '/maintenance/vehicle-costs/:vehicleNo',
    { feature: 'RELIABILITY', action: 'read' },
    (request) => {
      const to = isDay(request.query.to) ? request.query.to : todayIso()
      const from = isDay(request.query.from) ? request.query.from : addDays(to, -364)
      return ok(vehicleCostApi(db, routeParam(request, 'vehicleNo'), from <= to ? from : to, to))
    }
  )

  router.get('/maintenance/dashboard', { feature: 'MAINTENANCEDASHBOARD', action: 'read' }, () =>
    ok(maintenanceDashboardApi(db))
  )
}
