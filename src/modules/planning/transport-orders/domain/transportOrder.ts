import type { LoadCapacity } from '@/modules/fleet/vehicles/domain/capacity'
import { returnExpected } from '@/modules/planning/reception/domain/reception'

export const TRANSPORT_ORDER_STATUSES = [
  'draft',
  'planned',
  'confirmed',
  'ready',
  'in_progress',
  'completed',
  'cancelled'
] as const
export type TransportOrderStatus = (typeof TRANSPORT_ORDER_STATUSES)[number]

export const TRANSPORT_MEANS = ['fleet', 'carrier'] as const
export type TransportMeans = (typeof TRANSPORT_MEANS)[number]

/** The mode of transport of an order (TRS01-US11); the means on hand decide which are offered. */
export const TRANSPORT_MODES = ['road', 'rail', 'sea', 'air'] as const
export type TransportMode = (typeof TRANSPORT_MODES)[number]

export const TRANSPORT_ORDER_EVENT_KINDS = [
  'created',
  'lines_changed',
  'planned',
  'confirmed',
  'replanned',
  'replan_received',
  'route_validated',
  'route_changed',
  'rescheduled',
  'recipients_notified',
  'pickup_sent',
  'pickup_confirmed',
  'pickup_vehicle_changed',
  'pickup_site_changed',
  'note_cancelled',
  'note_deviated',
  'departed',
  'declared',
  'refused',
  'postponed',
  'qualified',
  'correction',
  'retried',
  'reception_confirmed',
  'reception_contested',
  'contest_handled',
  'satisfaction',
  'handed_back',
  'return_received',
  'remainder',
  'protest_prepared',
  'protest_issued',
  'protest_closed',
  'responsibility_set',
  'credit_issued',
  'invoiced',
  'closed',
  'cancelled'
] as const
export type TransportOrderEventKind = (typeof TRANSPORT_ORDER_EVENT_KINDS)[number]

/** A fleet trip that has left: the order stays on the road until delivery and closing exist. */
const TRIP_DEPARTED = ['in_progress', 'completed', 'closed']

export interface TransportOrderFacts {
  cancelledAt: string | null
  closedAt?: string | null
  means: TransportMeans | null
  /** Status of the fleet trip, when the order has one. */
  tripStatus: string | null
  /** Every line still in the tour has been confirmed. */
  linesConfirmed?: boolean
  /** Every line still to load has been checked conforming. */
  loadingReady?: boolean
  /** The carrier has been recorded as having left. Fleet departure is the trip status. */
  carrierDeparted?: boolean
  /** Every line is settled. */
  linesDelivered?: boolean
  /** The driver has marked his arrival on the first point: only this starts a fleet order. */
  firstArrival?: boolean
}

/**
 * Read from the facts. Seven statuses: pending, planned, confirmed, ready, in progress, completed,
 * cancelled. An order on the road stays in progress until the planner completes it, whatever its
 * lines say: the lines carry the reality of the field, never an automatic status change.
 */
export function transportOrderStatus(order: TransportOrderFacts): TransportOrderStatus {
  if (order.cancelledAt) return 'cancelled'
  if (order.closedAt) return 'completed'
  const fleetDeparted =
    order.means === 'fleet' && !!order.tripStatus && TRIP_DEPARTED.includes(order.tripStatus)
  /* TRS03-US09 CA01: a fleet order starts with the arrival on its first point, and only then. */
  const departed =
    order.means === 'fleet'
      ? fleetDeparted && order.firstArrival !== false
      : !!order.carrierDeparted
  if (departed) return 'in_progress'
  if (order.means && order.linesConfirmed && order.loadingReady) return 'ready'
  if (order.means && order.linesConfirmed) return 'confirmed'
  if (order.means) return 'planned'
  return 'draft'
}

export const canPlan = (status: TransportOrderStatus) => status === 'draft'

export const canEditLines = (status: TransportOrderStatus) =>
  status === 'draft' || status === 'planned'

/** The route and the departure belong to the trip once the order is planned. */
export const canEditSchedule = (status: TransportOrderStatus) => status === 'draft'

/** Only before the vehicle leaves: once in progress, the returns are recorded on the lines. */
export const canCancel = (status: TransportOrderStatus) =>
  status === 'draft' || status === 'planned' || status === 'confirmed' || status === 'ready'

/** The « awaiting closing » view: an order in progress whose every line has been dealt with. */
export const awaitingClosing = (status: TransportOrderStatus, linesDelivered: boolean) =>
  status === 'in_progress' && linesDelivered

export interface LoadLine {
  weightKg: number | null
  quantity: number
  fuel: boolean
  /** Cubic metres of the line, when known. */
  volumeM3?: number | null
}

export type LoadIssue =
  | { code: 'nothingToCarry' }
  | { code: 'payloadUnknown' }
  | { code: 'overWeight'; weightKg: number; maxLoadKg: number }
  | { code: 'overVolume'; volumeM3: number; maxVolumeM3: number }
  | { code: 'overFuel'; liters: number; capacityL: number }

/** Weight and volume of an order: the sum of its lines still in it (TRS01-US08). */
export function loadTotals(lines: readonly LoadLine[]) {
  const round = (value: number) => Math.round(value * 1000) / 1000
  return {
    weightKg: round(lines.reduce((total, line) => total + (line.weightKg ?? 0), 0)),
    volumeM3: round(lines.reduce((total, line) => total + (line.volumeM3 ?? 0), 0)),
    liters: round(lines.reduce((total, line) => total + (line.fuel ? line.quantity : 0), 0))
  }
}

export type FillTone = 'ok' | 'warning' | 'over'

/** Green below 90 %, orange from 90 %, red above 100 % (TRS01-US08). */
export function fillTone(percent: number | null): FillTone {
  if (percent === null || percent < 90) return 'ok'
  return percent > 100 ? 'over' : 'warning'
}

export interface LoadFill {
  weightPercent: number | null
  /** The fuller of the cubic metres and the litres of the compartments. */
  volumePercent: number | null
}

/** How full the combination is, in weight and in volume; null where the capacity is unknown. */
export function loadFill(lines: readonly LoadLine[], limit: LoadCapacity | null): LoadFill {
  if (!limit) return { weightPercent: null, volumePercent: null }
  const totals = loadTotals(lines)
  const percent = (value: number, max: number | null) =>
    max && max > 0 ? Math.round((value / max) * 1000) / 10 : null
  const byM3 = percent(totals.volumeM3, limit.maxVolumeM3)
  const byLiters = percent(totals.liters, limit.capacityL || null)
  const volumes = [byM3, byLiters].filter((value): value is number => value !== null)
  return {
    weightPercent: percent(totals.weightKg, limit.maxLoadKg),
    volumePercent: volumes.length ? Math.max(...volumes) : null
  }
}

/** Statuses an order can still be loaded in, hence expire in when its date passes. */
const NOT_EXECUTED = ['draft', 'planned', 'confirmed', 'ready']

/** An order past its planned day without having left (TRS07-US07). */
export function isExpired(
  status: TransportOrderStatus,
  plannedDeparture: string | null,
  today: string
): boolean {
  return (
    !!plannedDeparture && NOT_EXECUTED.includes(status) && plannedDeparture.slice(0, 10) < today
  )
}

/** The first reason a load does not fit a combination. Null when it fits, or when there is no load. */
export function loadIssue(
  lines: readonly LoadLine[],
  limit: LoadCapacity | null
): LoadIssue | null {
  if (!limit) return lines.length ? { code: 'nothingToCarry' } : null
  const { weightKg, volumeM3, liters } = loadTotals(lines)
  if (weightKg > 0 && limit.maxLoadKg === null) return { code: 'payloadUnknown' }
  if (limit.maxLoadKg !== null && weightKg > limit.maxLoadKg) {
    return { code: 'overWeight', weightKg, maxLoadKg: limit.maxLoadKg }
  }
  // Both are followed: depending on the goods, the weight or the volume is what matters.
  if (limit.maxVolumeM3 !== null && volumeM3 > limit.maxVolumeM3) {
    return { code: 'overVolume', volumeM3, maxVolumeM3: limit.maxVolumeM3 }
  }
  if (liters > limit.capacityL) return { code: 'overFuel', liters, capacityL: limit.capacityL }
  return null
}

export interface ServedPoint {
  name: string
  pumpRequired: boolean
  /** Empty means every vehicle type is accepted: a point states only the types it restricts. */
  acceptedVehicleTypeNos: readonly string[]
}

export type PointIssue =
  | { code: 'pumpRequired'; point: string }
  | { code: 'vehicleTypeRefused'; point: string }

/** The first delivery point the combination cannot serve. The type is the trailer's, else the truck's. */
export function pointIssue(
  points: readonly ServedPoint[],
  vehicleTypeNo: string,
  hasPump: boolean
): PointIssue | null {
  for (const point of points) {
    if (point.pumpRequired && !hasPump) return { code: 'pumpRequired', point: point.name }
    if (
      point.acceptedVehicleTypeNos.length > 0 &&
      !point.acceptedVehicleTypeNos.includes(vehicleTypeNo)
    ) {
      return { code: 'vehicleTypeRefused', point: point.name }
    }
  }
  return null
}

export type OrderLineState =
  | 'pending'
  | 'not_loaded'
  | 'declared'
  | 'refused'
  | 'postponed'
  | 'returned'
  | 'handed_back'

export interface OrderLineFacts {
  declaredAt: string | null
  refusalAt: string | null
  postponedAt: string | null
  returnedAt: string | null
  handedBackAt: string | null
  warehouseReceivedAt: string | null
  /** Found not conforming at loading: the line stays in the order, its outcome is drawn at the
   * end of the order. */
  nonconformityAt?: string | null
}

/** Where a line stands on the road. Goods back at the warehouse win over the reason they came back. */
export function orderLineState(line: OrderLineFacts): OrderLineState {
  if (line.handedBackAt || line.warehouseReceivedAt) return 'handed_back'
  if (line.nonconformityAt) return 'not_loaded'
  if (line.refusalAt) return 'refused'
  if (line.returnedAt) return 'returned'
  if (line.postponedAt) return 'postponed'
  if (line.declaredAt) return 'declared'
  return 'pending'
}

/** A line still to declare while the order is on the road. */
export const canDeclareLine = (status: TransportOrderStatus, line: OrderLineFacts) =>
  status === 'in_progress' && !line.declaredAt && !line.refusalAt && !line.returnedAt

/** Goods coming back that the driver has not handed to the warehouse yet. */
export const canHandBackLine = (line: OrderLineFacts) =>
  returnExpected(line) && !line.handedBackAt && !line.warehouseReceivedAt
