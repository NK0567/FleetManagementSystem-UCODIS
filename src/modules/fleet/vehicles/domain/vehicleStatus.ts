import type { VehicleStatus } from '../types/vehicle.types'

/** Why a vehicle cannot leave: each module adds its own (documents, inspections, downtimes, overdue services). */
export interface Immobilization {
  kind: 'document' | 'inspection' | 'maintenance' | 'service'
  detail: string
  /** Code of the cause in the unavailability codification, when one applies. */
  code?: string | null
  /** The vehicle is held at the workshop by a work order: it is in maintenance, not immobilized. */
  workshop?: boolean
}

export interface VehicleStatusFacts {
  removed: boolean
  outOfServiceReason: string | null
  immobilizations: readonly Immobilization[]
  activeTripNo: string | null
  driverName: string | null
  coupledPlate: string | null
}

export type VehicleStatusCause =
  | { kind: 'removed' }
  | { kind: 'out_of_service'; detail: string }
  | Immobilization
  | { kind: 'trip'; detail: string }
  | { kind: 'driver'; detail: string }
  | { kind: 'coupling'; detail: string }

export interface VehicleStatusResult {
  status: VehicleStatus
  cause: VehicleStatusCause | null
}

/**
 * The status is derived from facts, by priority, and never stored: a stored status goes stale
 * as soon as one of the facts changes elsewhere.
 */
export function vehicleStatus(facts: VehicleStatusFacts): VehicleStatusResult {
  if (facts.removed) return { status: 'removed', cause: { kind: 'removed' } }
  if (facts.outOfServiceReason !== null) {
    return {
      status: 'out_of_service',
      cause: { kind: 'out_of_service', detail: facts.outOfServiceReason }
    }
  }
  const workshop = facts.immobilizations.find((item) => item.workshop)
  if (workshop) return { status: 'in_maintenance', cause: workshop }
  const [immobilization] = facts.immobilizations
  if (immobilization) return { status: 'immobilized', cause: immobilization }
  if (facts.activeTripNo) {
    return { status: 'in_mission', cause: { kind: 'trip', detail: facts.activeTripNo } }
  }
  if (facts.driverName) {
    return { status: 'assigned', cause: { kind: 'driver', detail: facts.driverName } }
  }
  if (facts.coupledPlate) {
    return { status: 'assigned', cause: { kind: 'coupling', detail: facts.coupledPlate } }
  }
  return { status: 'available', cause: null }
}

const UNUSABLE: readonly VehicleStatus[] = [
  'in_maintenance',
  'immobilized',
  'out_of_service',
  'removed'
]

/** A vehicle that may be coupled, assigned or sent on a trip. */
export function isUsable(status: VehicleStatus): boolean {
  return !UNUSABLE.includes(status)
}

/** Plates are compared without case or spacing differences: "4021 tba" is "4021 TBA". */
export function normalizePlate(plate: string): string {
  return plate.trim().replace(/\s+/g, ' ').toUpperCase()
}

/** The three families of immobilization the managers read on their boards. */
export const IMMOBILIZATION_CATEGORIES = ['technical', 'administrative', 'human'] as const
export type ImmobilizationCategory = (typeof IMMOBILIZATION_CATEGORIES)[number]

/**
 * Family of the cause that keeps a vehicle from leaving: a breakdown, a check or an overdue
 * service is technical, a missing or expired paper is administrative. A vehicle held back by its
 * driver (leave, suspension) is human; that one is told from the driver, not from the vehicle.
 */
export function immobilizationCategory(
  cause: VehicleStatusCause | null
): ImmobilizationCategory | null {
  if (!cause) return null
  switch (cause.kind) {
    case 'maintenance':
    case 'inspection':
    case 'service':
    case 'out_of_service':
      return 'technical'
    case 'document':
      return 'administrative'
    default:
      return null
  }
}
