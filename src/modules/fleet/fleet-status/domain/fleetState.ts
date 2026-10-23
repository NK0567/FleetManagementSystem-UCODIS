import type { StopRole } from '@/modules/fleet/route-templates'
import type { TripStatus } from '@/modules/fleet/trips'
import type { VehicleStatus } from '@/modules/fleet/vehicles'

/** Only the states the system can actually tell from the records. */
export const FLEET_STATES = [
  'AVAILABLE',
  'TRIP_PLANNED',
  'TO_LOADING',
  'TO_DELIVERY',
  'RETURNING',
  'IMMOBILIZED'
] as const
export type FleetState = (typeof FLEET_STATES)[number]

export const FLEET_STATE_GROUPS = ['operational', 'transit', 'immobilized'] as const
export type FleetStateGroup = (typeof FLEET_STATE_GROUPS)[number]

const GROUP_OF: Record<FleetState, FleetStateGroup> = {
  AVAILABLE: 'operational',
  TRIP_PLANNED: 'operational',
  TO_LOADING: 'transit',
  TO_DELIVERY: 'transit',
  RETURNING: 'transit',
  IMMOBILIZED: 'immobilized'
}

export function fleetStateGroup(state: FleetState): FleetStateGroup {
  return GROUP_OF[state]
}

export interface FleetStateFacts {
  vehicleStatus: VehicleStatus
  /** The trip on the road, or else the next planned one. */
  tripStatus: TripStatus | null
  /** Roles of the stops not passed yet, when on the road. */
  stopsAhead: readonly StopRole[]
}

export function fleetState(facts: FleetStateFacts): FleetState {
  if (facts.vehicleStatus === 'immobilized' || facts.vehicleStatus === 'out_of_service') {
    return 'IMMOBILIZED'
  }
  if (facts.tripStatus === 'in_progress') {
    if (facts.stopsAhead.includes('loading')) return 'TO_LOADING'
    if (facts.stopsAhead.includes('delivery')) return 'TO_DELIVERY'
    return 'RETURNING'
  }
  return facts.tripStatus === 'planned' ? 'TRIP_PLANNED' : 'AVAILABLE'
}
