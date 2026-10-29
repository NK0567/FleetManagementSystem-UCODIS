import { describe, expect, it } from 'vitest'
import { againstTarget, averageAgeYears, vehicleAgeYears } from './park'

describe('park indicators', () => {
  it('age a vehicle from its first registration, or else from its model year', () => {
    expect(
      vehicleAgeYears({ firstRegistrationDate: '2020-09-04', year: 2019 }, '2026-09-04')
    ).toBeCloseTo(6, 1)
    expect(vehicleAgeYears({ firstRegistrationDate: null, year: 2021 }, '2026-09-04')).toBe(5)
    expect(vehicleAgeYears({ firstRegistrationDate: null, year: null }, '2026-09-04')).toBeNull()
  })

  it('average only the known ages and say when none is known', () => {
    const today = '2026-09-04'
    expect(
      averageAgeYears(
        [
          { firstRegistrationDate: null, year: 2020 },
          { firstRegistrationDate: null, year: 2024 },
          { firstRegistrationDate: null, year: null }
        ],
        today
      )
    ).toBe(4)
    expect(averageAgeYears([], today)).toBeNull()
  })

  it('compare the availability with its target', () => {
    expect(againstTarget(92, 90)).toBe('reached')
    expect(againstTarget(85, 90)).toBe('missed')
    expect(againstTarget(null, 90)).toBeNull()
  })
})
