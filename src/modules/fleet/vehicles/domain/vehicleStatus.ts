import type { VehicleStatus } from '../types/vehicle.types'

/** Why a vehicle cannot leave: each module adds its own (documents, inspections, downtimes, overdue services). */
export interface Immobilization {
  kind: 'document' | 'inspection' | 'maintenance' | 'service'
  detail: string
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
  | { kind: Immobilization['kind']; detail: string }
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

const UNUSABLE: readonly VehicleStatus[] = ['immobilized', 'out_of_service', 'removed']

/** A vehicle that may be coupled, assigned or sent on a trip. */
export function isUsable(status: VehicleStatus): boolean {
  return !UNUSABLE.includes(status)
}

/** Plates are compared without case or spacing differences: "4021 tba" is "4021 TBA". */
export function normalizePlate(plate: string): string {
  return plate.trim().replace(/\s+/g, ' ').toUpperCase()
}
