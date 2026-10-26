import { describe, expect, it } from 'vitest'
import {
  averageLitersPer100,
  consumptionPeriods,
  consumptionReference,
  deductionIssues,
  excessCost,
  gapPercent,
  litersPer100
} from './consumption'

const refill = (no: string, day: number, odometerKm: number, liters: number, fullTank = true) => ({
  no,
  refueledAt: `2026-09-0${day}T08:00:00`,
  liters,
  unitPrice: 5000,
  odometerKm,
  fullTank
})

describe('consumptionPeriods', () => {
  it('counts what was put in after a full tank, up to the next full tank', () => {
    const periods = consumptionPeriods([
      refill('R3', 5, 101_000, 200),
      refill('R1', 1, 100_000, 300),
      refill('R2', 3, 100_500, 150, false)
    ])
    expect(periods).toEqual([
      {
        openingNo: 'R1',
        closingNo: 'R3',
        from: '2026-09-01T08:00:00',
        to: '2026-09-05T08:00:00',
        km: 1000,
        liters: 350,
        averagePrice: 5000
      }
    ])
  })
})

describe('consumption figures', () => {
  it('compute L/100 and weight the average by distance', () => {
    expect(litersPer100(350, 1000)).toBe(35)
    expect(litersPer100(100, 0)).toBeNull()
    expect(
      averageLitersPer100([
        { km: 1000, liters: 350 },
        { km: 100, liters: 50 }
      ])
    ).toBe(36.4)
  })

  it('take the route reference first, then the vehicle type, then the default', () => {
    expect(consumptionReference(32, 37, 40)).toEqual({ value: 32, source: 'route' })
    expect(consumptionReference(null, 37, 40)).toEqual({ value: 37, source: 'vehicleType' })
    expect(consumptionReference(null, null, 40)).toEqual({ value: 40, source: 'default' })
  })

  it('price the litres beyond the reference', () => {
    expect(gapPercent(40, 37)).toBe(8.1)
    expect(excessCost({ km: 1000, liters: 400, averagePrice: 5000 }, 37)).toBe(150_000)
    expect(excessCost({ km: 1000, liters: 300, averagePrice: 5000 }, 37)).toBe(0)
  })
})

describe('deductionIssues', () => {
  it('only charges a chargeable cause, within the excess cost and the cap', () => {
    expect(deductionIssues(100_000, true, 150_000, 200_000)).toEqual([])
    expect(deductionIssues(100_000, false, 150_000, null)).toEqual(['causeNotChargeable'])
    expect(deductionIssues(160_000, true, 150_000, 120_000)).toEqual([
      'aboveExcessCost',
      'aboveCap'
    ])
  })
})
