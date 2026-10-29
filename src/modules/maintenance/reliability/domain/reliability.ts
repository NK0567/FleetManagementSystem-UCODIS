import type { MaintenanceType } from '@/modules/maintenance/work-orders/domain/workOrder'

/** A km reading of a vehicle, from any record that knows it: odometer, refill, trip, work order. */
export interface OdometerPoint {
  at: string
  km: number
}

/** The odometer at an instant, read between the surrounding points; flat before the first and after the last. */
export function kmAt(points: readonly OdometerPoint[], at: string): number | null {
  const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at))
  if (!sorted.length) return null
  const time = new Date(at).getTime()
  const first = sorted[0]!
  const last = sorted.at(-1)!
  if (time <= new Date(first.at).getTime()) return first.km
  if (time >= new Date(last.at).getTime()) return last.km
  const after = sorted.findIndex((point) => new Date(point.at).getTime() >= time)
  const before = sorted[after - 1]!
  const next = sorted[after]!
  const span = new Date(next.at).getTime() - new Date(before.at).getTime()
  const share = span ? (time - new Date(before.at).getTime()) / span : 0
  return Math.round(before.km + (next.km - before.km) * share)
}

/** Km a vehicle ran within a period, from its readings. */
export function kmInPeriod(points: readonly OdometerPoint[], from: string, to: string): number {
  const start = kmAt(points, from)
  const end = kmAt(points, to)
  return start === null || end === null ? 0 : Math.max(0, end - start)
}

const HOUR_MS = 3_600_000

export interface ReliabilityOrder {
  maintenanceType: MaintenanceType
  /** Imported history counts in costs, not in reliability: its dates and km are not reliable. */
  imported: boolean
  cancelled: boolean
  declaredAt: string
  completedAt: string | null
  validatedAt: string | null
  totalCost: number
}

export interface ReliabilityKpis {
  /** Mean time to repair: corrective orders, from their opening to their validated closing, in hours. */
  mttrHours: number | null
  /** Mean km between failures: fleet km of the period over its corrective orders. */
  mtbfKm: number | null
  preventiveShare: number | null
  /** Cost of the orders validated in the period over the km run in it. */
  costPerKm: number | null
  /** Share of vehicle-days not lost to a downtime, in percent. */
  availabilityRate: number | null
  failures: number
  totalCost: number
  fleetKm: number
  lostDays: number
}

const inPeriod = (at: string | null, from: string, to: string) => !!at && at >= from && at <= to

export function reliabilityKpis(input: {
  orders: readonly ReliabilityOrder[]
  fleetKm: number
  lostDays: number
  vehicleDays: number
  from: string
  to: string
}): ReliabilityKpis {
  const { from, to } = input
  const live = input.orders.filter((order) => !order.cancelled)
  const measured = live.filter((order) => !order.imported && inPeriod(order.declaredAt, from, to))
  const failures = measured.filter((order) => order.maintenanceType === 'corrective')
  const repairs = failures
    .filter((order) => order.validatedAt)
    .map(
      (order) =>
        (new Date(order.validatedAt!).getTime() - new Date(order.declaredAt).getTime()) / HOUR_MS
    )
  const totalCost = live
    .filter((order) => inPeriod(order.validatedAt, from, to))
    .reduce((total, order) => total + order.totalCost, 0)
  const round = (value: number, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits
  return {
    mttrHours: repairs.length
      ? round(repairs.reduce((total, hours) => total + hours, 0) / repairs.length, 1)
      : null,
    mtbfKm: failures.length && input.fleetKm ? Math.round(input.fleetKm / failures.length) : null,
    preventiveShare: measured.length
      ? Math.round(
          (measured.filter((order) => order.maintenanceType === 'preventive').length /
            measured.length) *
            100
        )
      : null,
    costPerKm: input.fleetKm ? round(totalCost / input.fleetKm, 2) : null,
    availabilityRate: input.vehicleDays
      ? round(Math.max(0, 1 - input.lostDays / input.vehicleDays) * 100, 1)
      : null,
    failures: failures.length,
    totalCost,
    fleetKm: input.fleetKm,
    lostDays: round(input.lostDays, 2)
  }
}

const DAY_MS = 86_400_000

/** Days two periods share, counted on whole days. */
export function overlapDays(start: string, end: string, from: string, to: string): number {
  const first = Math.max(
    new Date(start.slice(0, 10)).getTime(),
    new Date(from.slice(0, 10)).getTime()
  )
  const last = Math.min(new Date(end.slice(0, 10)).getTime(), new Date(to.slice(0, 10)).getTime())
  return last >= first ? Math.round((last - first) / DAY_MS) + 1 : 0
}

/** The part of a yearly premium that falls in the period. */
export function premiumShare(
  annualPremium: number,
  policy: { startDate: string; endDate: string },
  from: string,
  to: string
): number {
  return Math.round((annualPremium * overlapDays(policy.startDate, policy.endDate, from, to)) / 365)
}

export interface OwnershipCost {
  maintenance: number
  fuel: number
  tyres: number
  insurance: number
  /** Running cost of the period; acquisition stays apart, it is not spread over the years. */
  total: number
  costPerKm: number | null
}

export function ownershipCost(
  parts: Pick<OwnershipCost, 'maintenance' | 'fuel' | 'tyres' | 'insurance'>,
  km: number
): OwnershipCost {
  const total = parts.maintenance + parts.fuel + parts.tyres + parts.insurance
  return { ...parts, total, costPerKm: km > 0 ? Math.round((total / km) * 100) / 100 : null }
}

/** How an indicator reads against its target: some must reach it, others stay under it. */
export function targetState(
  value: number | null,
  target: number,
  direction: 'atLeast' | 'atMost'
): 'reached' | 'missed' | null {
  if (value === null) return null
  const reached = direction === 'atLeast' ? value >= target : value <= target
  return reached ? 'reached' : 'missed'
}
