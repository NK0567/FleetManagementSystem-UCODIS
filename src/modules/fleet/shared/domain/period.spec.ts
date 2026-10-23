import { describe, expect, it } from 'vitest'
import { latestEnd, periodDays, periodState } from './period'

describe('period', () => {
  it('is active until it has an end date', () => {
    expect(periodState({ startDate: '2026-01-01', endDate: null })).toBe('active')
    expect(periodState({ startDate: '2026-01-01', endDate: '2026-02-01' })).toBe('ended')
  })

  it('counts both ends, and up to today while running', () => {
    expect(periodDays({ startDate: '2026-01-01', endDate: '2026-01-01' }, '2026-09-04')).toBe(1)
    expect(periodDays({ startDate: '2026-09-01', endDate: null }, '2026-09-04')).toBe(4)
  })

  it('finds the latest end among past periods', () => {
    expect(
      latestEnd([
        { startDate: '2025-01-01', endDate: '2025-03-01' },
        { startDate: '2025-04-01', endDate: '2025-06-30' },
        { startDate: '2025-07-01', endDate: null }
      ])
    ).toBe('2025-06-30')
    expect(latestEnd([])).toBeNull()
  })
})
