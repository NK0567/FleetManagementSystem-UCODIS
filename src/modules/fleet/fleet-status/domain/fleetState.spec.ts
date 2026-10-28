import { describe, expect, it } from 'vitest'
import { fleetState, fleetStateGroup } from './fleetState'

describe('fleetState', () => {
  it('puts immobilized and out of service vehicles aside first', () => {
    expect(
      fleetState({ vehicleStatus: 'out_of_service', tripStatus: 'planned', stopsAhead: [] })
    ).toBe('IMMOBILIZED')
  })

  it('tells where a vehicle on the road is heading', () => {
    expect(
      fleetState({
        vehicleStatus: 'in_mission',
        tripStatus: 'in_progress',
        stopsAhead: ['loading', 'delivery']
      })
    ).toBe('TO_LOADING')
    expect(
      fleetState({
        vehicleStatus: 'in_mission',
        tripStatus: 'in_progress',
        stopsAhead: ['rest', 'delivery']
      })
    ).toBe('TO_DELIVERY')
    expect(
      fleetState({
        vehicleStatus: 'in_mission',
        tripStatus: 'in_progress',
        stopsAhead: ['arrival']
      })
    ).toBe('RETURNING')
  })

  it('separates a planned departure from a free vehicle', () => {
    expect(fleetState({ vehicleStatus: 'assigned', tripStatus: 'planned', stopsAhead: [] })).toBe(
      'TRIP_PLANNED'
    )
    expect(fleetState({ vehicleStatus: 'available', tripStatus: null, stopsAhead: [] })).toBe(
      'AVAILABLE'
    )
    expect(fleetStateGroup('RETURNING')).toBe('transit')
  })
})
