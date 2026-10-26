import { describe, expect, it } from 'vitest'
import { combinationCapacity } from '@/modules/fleet/vehicles/domain/capacity'
import {
  canCancel,
  canEditLines,
  canEditSchedule,
  canPlan,
  loadIssue,
  pointIssue,
  transportOrderStatus
} from './transportOrder'

const draft = { cancelledAt: null, means: null, tripStatus: null }

describe('transport order status', () => {
  it('reads the status from the means and the trip', () => {
    expect(transportOrderStatus(draft)).toBe('draft')
    expect(transportOrderStatus({ ...draft, means: 'fleet', tripStatus: 'planned' })).toBe(
      'planned'
    )
    expect(transportOrderStatus({ ...draft, means: 'carrier', tripStatus: null })).toBe('planned')
    expect(transportOrderStatus({ ...draft, means: 'fleet', tripStatus: 'in_progress' })).toBe(
      'in_progress'
    )
    expect(transportOrderStatus({ ...draft, means: 'fleet', tripStatus: 'closed' })).toBe(
      'in_progress'
    )
    expect(
      transportOrderStatus({
        cancelledAt: '2026-09-04T11:00:00',
        means: 'fleet',
        tripStatus: 'in_progress'
      })
    ).toBe('cancelled')
  })

  it('allows each action only from the states where it makes sense', () => {
    expect(canPlan('draft')).toBe(true)
    expect(canPlan('planned')).toBe(false)
    expect(canEditLines('planned')).toBe(true)
    expect(canEditLines('in_progress')).toBe(false)
    expect(canEditSchedule('draft')).toBe(true)
    expect(canEditSchedule('planned')).toBe(false)
    expect(canCancel('in_progress')).toBe(true)
    expect(canCancel('cancelled')).toBe(false)
  })
})

describe('what a combination can take', () => {
  const semi = { carriesGoods: true, maxLoadKg: 32_000, maxVolumeM3: 86, totalCapacityL: 0 }
  const tractor = { carriesGoods: false, maxLoadKg: 44_000, maxVolumeM3: null, totalCapacityL: 0 }
  const tanker = {
    carriesGoods: true,
    maxLoadKg: 30_000,
    maxVolumeM3: null,
    totalCapacityL: 30_000
  }
  const line = { weightKg: 1000, quantity: 10, fuel: false }

  it('refuses a tractor alone, an overload and fuel beyond the tank', () => {
    expect(loadIssue([line], combinationCapacity(tractor, null))?.code).toBe('nothingToCarry')
    expect(loadIssue([line], combinationCapacity(tractor, semi))).toBeNull()
    expect(
      loadIssue([{ ...line, weightKg: 40_000 }], combinationCapacity(tractor, semi))
    ).toMatchObject({ code: 'overWeight', maxLoadKg: 32_000 })
    expect(
      loadIssue(
        [{ weightKg: null, quantity: 40_000, fuel: true }],
        combinationCapacity(tractor, tanker)
      )
    ).toMatchObject({ code: 'overFuel', capacityL: 30_000 })
    expect(
      loadIssue(
        [{ weightKg: null, quantity: 18_000, fuel: true }],
        combinationCapacity(tractor, tanker)
      )
    ).toBeNull()
  })

  it('checks the pump and the vehicle type the point asks for', () => {
    const open = { name: 'Quai', pumpRequired: false, acceptedVehicleTypeNos: [] }
    const station = { name: 'Station', pumpRequired: true, acceptedVehicleTypeNos: ['TANKER'] }
    expect(pointIssue([open], 'SEMI-TRAILER', false)).toBeNull()
    expect(pointIssue([station], 'TANKER', false)?.code).toBe('pumpRequired')
    expect(pointIssue([station], 'SEMI-TRAILER', true)?.code).toBe('vehicleTypeRefused')
    expect(pointIssue([station], 'TANKER', true)).toBeNull()
  })
})
