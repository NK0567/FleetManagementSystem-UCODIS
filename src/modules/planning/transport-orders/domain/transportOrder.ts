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

export const TRANSPORT_ORDER_EVENT_KINDS = [
  'created',
  'lines_changed',
  'planned',
  'confirmed',
  'replanned',
  'pickup_sent',
  'pickup_confirmed',
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
  const departed = fleetDeparted || !!order.carrierDeparted
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
