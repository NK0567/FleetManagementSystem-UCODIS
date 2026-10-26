import type { LoadCapacity } from '@/modules/fleet/vehicles/domain/capacity'

export const TRANSPORT_ORDER_STATUSES = [
  'draft',
  'planned',
  'confirmed',
  'ready',
  'in_progress',
  'delivered',
  'cancelled'
] as const
export type TransportOrderStatus = (typeof TRANSPORT_ORDER_STATUSES)[number]

export const TRANSPORT_MEANS = ['fleet', 'carrier'] as const
export type TransportMeans = (typeof TRANSPORT_MEANS)[number]

export const TRANSPORT_ORDER_EVENT_KINDS = [
  'created',
  'lines_changed',
  'planned',
  'confirmed',
  'replanned',
  'departed',
  'declared',
  'refused',
  'postponed',
  'qualified',
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
  'cancelled'
] as const
export type TransportOrderEventKind = (typeof TRANSPORT_ORDER_EVENT_KINDS)[number]

/** A fleet trip that has left: the order stays on the road until delivery and closing exist. */
const TRIP_DEPARTED = ['in_progress', 'completed', 'closed']

export interface TransportOrderFacts {
  cancelledAt: string | null
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
}

/**
 * Read from the facts. Delivered and closed arrive with execution and closing;
 * until then a trip that has left keeps the order in progress.
 */
export function transportOrderStatus(order: TransportOrderFacts): TransportOrderStatus {
  if (order.cancelledAt) return 'cancelled'
  const fleetDeparted =
    order.means === 'fleet' && !!order.tripStatus && TRIP_DEPARTED.includes(order.tripStatus)
  const departed = fleetDeparted || !!order.carrierDeparted
  if (departed && order.linesDelivered) return 'delivered'
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

/** Allowed up to and including the road. A delivered order stays. */
export const canCancel = (status: TransportOrderStatus) =>
  status !== 'cancelled' && status !== 'delivered'

export interface LoadLine {
  weightKg: number | null
  quantity: number
  fuel: boolean
}

export type LoadIssue =
  | { code: 'nothingToCarry' }
  | { code: 'payloadUnknown' }
  | { code: 'overWeight'; weightKg: number; maxLoadKg: number }
  | { code: 'overFuel'; liters: number; capacityL: number }

/** The first reason a load does not fit a combination. Null when it fits, or when there is no load. */
export function loadIssue(
  lines: readonly LoadLine[],
  limit: LoadCapacity | null
): LoadIssue | null {
  if (!limit) return lines.length ? { code: 'nothingToCarry' } : null
  const weightKg = lines.reduce((total, line) => total + (line.weightKg ?? 0), 0)
  const liters = lines.reduce((total, line) => total + (line.fuel ? line.quantity : 0), 0)
  if (weightKg > 0 && limit.maxLoadKg === null) return { code: 'payloadUnknown' }
  if (limit.maxLoadKg !== null && weightKg > limit.maxLoadKg) {
    return { code: 'overWeight', weightKg, maxLoadKg: limit.maxLoadKg }
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
