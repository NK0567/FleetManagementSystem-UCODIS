import { describe, expect, it } from 'vitest'
import { vehicleTypeIssues } from './vehicleType'

const tractor = {
  motorized: true,
  couplingRole: 'tows',
  carriesGoods: false,
  hasCompartments: false
} as const

describe('vehicleTypeIssues', () => {
  it('accepts the default types', () => {
    expect(vehicleTypeIssues(tractor)).toEqual([])
    expect(
      vehicleTypeIssues({
        motorized: false,
        couplingRole: 'towed',
        carriesGoods: true,
        hasCompartments: true
      })
    ).toEqual([])
  })

  it('refuses a motorized vehicle towed by another one', () => {
    expect(vehicleTypeIssues({ ...tractor, couplingRole: 'towed' })).toEqual([
      'motorizedCannotBeTowed'
    ])
  })

  it('refuses an unpowered vehicle that tows', () => {
    expect(vehicleTypeIssues({ ...tractor, motorized: false })).toEqual(['unpoweredCannotTow'])
  })

  it('only gives compartments to a vehicle carrying goods', () => {
    expect(vehicleTypeIssues({ ...tractor, hasCompartments: true })).toEqual([
      'compartmentsNeedGoods'
    ])
  })
})
