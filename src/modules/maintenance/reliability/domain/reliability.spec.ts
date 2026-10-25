import { describe, expect, it } from 'vitest'
import { kmAt, kmInPeriod, reliabilityKpis, type ReliabilityOrder } from './reliability'

const points = [
  { at: '2026-08-01T00:00:00', km: 100_000 },
  { at: '2026-08-11T00:00:00', km: 102_000 }
]

describe('km of a period', () => {
  it('reads between points and stays flat outside them', () => {
    expect(kmAt(points, '2026-08-06T00:00:00')).toBe(101_000)
    expect(kmAt(points, '2026-07-01T00:00:00')).toBe(100_000)
    expect(kmAt([], '2026-07-01T00:00:00')).toBeNull()
    expect(kmInPeriod(points, '2026-08-06T00:00:00', '2026-09-01T00:00:00')).toBe(1_000)
  })
})

describe('reliability indicators', () => {
  const order = (overrides: Partial<ReliabilityOrder>): ReliabilityOrder => ({
    maintenanceType: 'corrective',
    imported: false,
    cancelled: false,
    declaredAt: '2026-08-02T08:00:00',
    completedAt: '2026-08-02T14:00:00',
    validatedAt: '2026-08-02T16:00:00',
    totalCost: 100_000,
    ...overrides
  })

  it('follow the standard definitions and leave imported history out of reliability', () => {
    const kpis = reliabilityKpis({
      orders: [
        order({}),
        order({ completedAt: '2026-08-03T08:00:00' }),
        order({ maintenanceType: 'preventive', totalCost: 50_000 }),
        order({ imported: true, totalCost: 400_000 }),
        order({ cancelled: true, totalCost: 900_000 }),
        order({ declaredAt: '2026-07-01T08:00:00', validatedAt: '2026-07-01T16:00:00' })
      ],
      fleetKm: 20_000,
      lostDays: 3,
      vehicleDays: 300,
      from: '2026-08-01T00:00:00',
      to: '2026-08-31T23:59:59'
    })
    expect(kpis).toEqual({
      mttrHours: 15,
      mtbfKm: 10_000,
      preventiveShare: 33,
      costPerKm: 32.5,
      availabilityRate: 99,
      failures: 2,
      totalCost: 650_000,
      fleetKm: 20_000,
      lostDays: 3
    })
  })
})
