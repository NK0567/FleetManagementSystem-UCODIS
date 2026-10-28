export const FUEL_TOUR_STATES = ['draft', 'validated', 'cancelled'] as const
export type FuelTourState = (typeof FUEL_TOUR_STATES)[number]

export function fuelTourState(tour: {
  validatedAt: string | null
  cancelledAt: string | null
}): FuelTourState {
  if (tour.cancelledAt) return 'cancelled'
  return tour.validatedAt ? 'validated' : 'draft'
}

export const VOLUME15_METHODS = ['coefficient', 'typed'] as const
export type Volume15Method = (typeof VOLUME15_METHODS)[number]

export interface FuelMeasure {
  volumeL: number
  temperature: number | null
  /** Typed volume at 15 °C. It wins over the computed one. */
  volume15: number | null
  /** Why a compartment was not unloaded. Required when the volume is 0. */
  emptyReason: string
}

/** V15 = volume × (1 − coefficient × (temperature − 15)). A typed value is kept. */
export function volumeAt15(
  measure: FuelMeasure,
  method: Volume15Method,
  expansionCoefficient: number | null
): number | null {
  if (measure.volume15 !== null) return measure.volume15
  if (method !== 'coefficient' || measure.volumeL <= 0 || measure.temperature === null) return null
  if (expansionCoefficient === null || expansionCoefficient <= 0) return null
  return Math.round(measure.volumeL * (1 - expansionCoefficient * (measure.temperature - 15)))
}

/**
 * Received litres: the sum of the volumes at 15 °C when every unloaded compartment has one,
 * otherwise the sum of the measured volumes. An empty compartment does not count.
 */
export function receivedLitres(
  measures: readonly FuelMeasure[],
  method: Volume15Method,
  expansionCoefficient: number | null
): number | null {
  const unloaded = measures.filter((measure) => measure.volumeL > 0)
  if (!unloaded.length) return null
  const at15 = unloaded.map((measure) => volumeAt15(measure, method, expansionCoefficient))
  if (at15.every((value) => value !== null))
    return at15.reduce((sum, value) => sum + (value ?? 0), 0)
  return unloaded.reduce((sum, measure) => sum + measure.volumeL, 0)
}

export function emptyMeasureIssue(measure: FuelMeasure): boolean {
  return measure.volumeL === 0 && measure.emptyReason.trim() === ''
}

export interface PlanSlot {
  vehicleNo: string
  compartmentNo: number
  capacityL: number
  productNo: string
  volumeL: number
  deliveryRequestNo: string
  requestProductNo: string
  requestQuantity: number
}

export type PlanIssue = 'product' | 'volume' | 'capacity' | 'over_order' | 'duplicate'

/** One product per compartment, within its capacity, and not more than the request asked. */
export function planIssue(slots: readonly PlanSlot[]): PlanIssue | null {
  const seen = new Set<string>()
  const byRequest = new Map<string, { quantity: number; planned: number }>()
  for (const slot of slots) {
    const key = `${slot.vehicleNo}:${slot.compartmentNo}`
    if (seen.has(key)) return 'duplicate'
    seen.add(key)
    if (slot.productNo !== slot.requestProductNo) return 'product'
    if (slot.volumeL <= 0) return 'volume'
    if (slot.volumeL > slot.capacityL) return 'capacity'
    const current = byRequest.get(slot.deliveryRequestNo) ?? {
      quantity: slot.requestQuantity,
      planned: 0
    }
    current.planned += slot.volumeL
    byRequest.set(slot.deliveryRequestNo, current)
  }
  for (const request of byRequest.values()) {
    if (request.planned > request.quantity) return 'over_order'
  }
  return null
}

export function planCovers(
  slots: readonly { deliveryRequestNo: string; volumeL: number }[],
  requests: readonly { no: string; quantity: number }[]
): boolean {
  return requests.every((request) => {
    const planned = slots
      .filter((slot) => slot.deliveryRequestNo === request.no)
      .reduce((sum, slot) => sum + slot.volumeL, 0)
    return planned === request.quantity
  })
}
