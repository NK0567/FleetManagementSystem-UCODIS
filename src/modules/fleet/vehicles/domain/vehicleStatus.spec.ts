import { describe, expect, it } from 'vitest'
import { isUsable, normalizePlate, vehicleStatus, type VehicleStatusFacts } from './vehicleStatus'

const idle: VehicleStatusFacts = {
  removed: false,
  outOfServiceReason: null,
  immobilizations: [],
  activeTripNo: null,
  driverName: null,
  coupledPlate: null
}

describe('vehicleStatus', () => {
  it('is available without any fact', () => {
    expect(vehicleStatus(idle)).toEqual({ status: 'available', cause: null })
  })

  it('applies the facts by priority', () => {
    const busy: VehicleStatusFacts = {
      removed: false,
      outOfServiceReason: 'Accident',
      immobilizations: [{ kind: 'document', detail: 'Visite technique' }],
      activeTripNo: 'TRP-00001',
      driverName: 'Hery',
      coupledPlate: 'RM 4101'
    }
    expect(vehicleStatus({ ...busy, removed: true }).status).toBe('removed')
    expect(vehicleStatus(busy).status).toBe('out_of_service')
    expect(vehicleStatus({ ...busy, outOfServiceReason: null })).toEqual({
      status: 'immobilized',
      cause: { kind: 'document', detail: 'Visite technique' }
    })
    expect(vehicleStatus({ ...busy, outOfServiceReason: null, immobilizations: [] }).status).toBe(
      'in_mission'
    )
  })

  it('counts a driver or a coupling as an assignment', () => {
    expect(vehicleStatus({ ...idle, driverName: 'Hery' }).cause).toEqual({
      kind: 'driver',
      detail: 'Hery'
    })
    expect(vehicleStatus({ ...idle, coupledPlate: '4021 TBA' }).status).toBe('assigned')
  })
})

describe('isUsable', () => {
  it('keeps immobilized, out of service and removed vehicles off the road', () => {
    expect(isUsable('assigned')).toBe(true)
    expect(isUsable('immobilized')).toBe(false)
    expect(isUsable('removed')).toBe(false)
  })
})

describe('normalizePlate', () => {
  it('ignores case and extra spaces', () => {
    expect(normalizePlate('  4021   tba ')).toBe('4021 TBA')
  })
})
