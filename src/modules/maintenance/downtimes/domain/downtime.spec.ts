import { describe, expect, it } from 'vitest'
import { dayCostOf, downtimeDays, downtimeDaysWithin, downtimeStatus } from './downtime'

describe('downtimeDays', () => {
  it('counts fractions of a day, until now while still open', () => {
    expect(downtimeDays('2026-09-01T08:00:00', '2026-09-01T20:00:00', '2026-09-04T10:00:00')).toBe(
      0.5
    )
    expect(downtimeDays('2026-09-03T10:00:00', null, '2026-09-04T10:00:00')).toBe(1)
    expect(downtimeStatus({ endedAt: null })).toBe('open')
  })

  it('keeps only the part inside a period', () => {
    expect(
      downtimeDaysWithin(
        '2026-08-30T00:00:00',
        '2026-09-02T00:00:00',
        '2026-09-04T00:00:00',
        '2026-09-01T00:00:00',
        '2026-09-30T00:00:00'
      )
    ).toBe(1)
  })
})

describe('dayCostOf', () => {
  it('falls back on the average day cost', () => {
    const costs = { dayCost: 450_000, tractorDayCost: 600_000, trailerDayCost: null }
    expect(dayCostOf(true, costs)).toBe(600_000)
    expect(dayCostOf(false, costs)).toBe(450_000)
  })
})
