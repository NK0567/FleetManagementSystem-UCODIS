import { describe, expect, it } from 'vitest'
import {
  costPerKm,
  isDotCode,
  layoutIssues,
  layoutPositions,
  rotationDue,
  safetyAlert,
  stintKm,
  tyreCostShare
} from './tyre'

const tractor = {
  axles: [
    { label: 'Essieu avant', twin: false },
    { label: 'Essieu arrière', twin: true }
  ],
  spares: 1
}

describe('tyre layout', () => {
  it('numbers positions front to back, left to right, then the spares', () => {
    expect(layoutPositions(tractor).map((position) => position.code)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      'S1'
    ])
    expect(layoutPositions(tractor)[2]).toMatchObject({ axleRank: 1, side: 'left_outer' })
  })

  it('needs an axle, labels and at most four spares', () => {
    expect(layoutIssues(tractor)).toEqual([])
    expect(layoutIssues({ axles: [], spares: 5 })).toEqual(['noAxle', 'spares'])
  })
})

describe('tyre wear and cost', () => {
  const odometer = (vehicleNo: string) => (vehicleNo === 'VEH-001' ? 182_400 : 0)

  it('runs the open stint to the current odometer and shares the cost by km', () => {
    expect(
      stintKm({ vehicleNo: 'VEH-001', positionCode: '1', fromKm: 150_000, toKm: null }, odometer)
    ).toBe(32_400)
    const share = tyreCostShare(
      1_200_000,
      new Map([
        ['VEH-001', 30_000],
        ['VEH-002', 10_000]
      ])
    )
    expect([...share]).toEqual([
      ['VEH-001', 900_000],
      ['VEH-002', 300_000]
    ])
    expect(costPerKm(1_200_000, 40_000)).toBe(30)
    expect(costPerKm(1_200_000, 0)).toBeNull()
  })

  it('alerts at the safety thresholds and when a rotation is due', () => {
    const thresholds = { minPressureBar: 7, minTreadMm: 2, rotationKm: 30_000, rotationMonths: 6 }
    expect(safetyAlert({ pressureBar: 8.5, treadMm: 1.8 }, thresholds)).toEqual(['tread'])
    expect(safetyAlert({ pressureBar: 7, treadMm: 6 }, thresholds)).toEqual(['pressure'])
    expect(safetyAlert(null, thresholds)).toEqual([])
    const since = { km: 150_000, date: '2026-07-01' }
    expect(rotationDue(since, { km: 182_400, today: '2026-09-04' }, thresholds, false)).toBe(true)
    expect(rotationDue(since, { km: 160_000, today: '2026-09-04' }, thresholds, false)).toBe(false)
    expect(rotationDue(since, { km: 160_000, today: '2027-01-15' }, thresholds, false)).toBe(true)
    expect(rotationDue(since, { km: 190_000, today: '2026-09-04' }, thresholds, true)).toBe(false)
  })

  it('reads a DOT week and year', () => {
    expect(isDotCode('2324')).toBe(true)
    expect(isDotCode('5824')).toBe(false)
    expect(isDotCode('23-4')).toBe(false)
  })
})
