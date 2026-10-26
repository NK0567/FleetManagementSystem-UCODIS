import { describe, expect, it } from 'vitest'
import { coversDay, periodsOverlap, policyIssues, policyState } from './insurancePolicy'

const year = { startDate: '2026-01-01', endDate: '2026-12-31', terminatedOn: null }

describe('policyState', () => {
  it('follows the period, with the notice before the end', () => {
    expect(policyState(year, 30, '2025-12-20')).toBe('upcoming')
    expect(policyState(year, 30, '2026-06-01')).toBe('active')
    expect(policyState(year, 30, '2026-12-01')).toBe('expiring')
    expect(policyState(year, 30, '2027-01-01')).toBe('expired')
  })

  it('stops at the termination, and does not ask to renew a terminated policy', () => {
    const terminated = { ...year, terminatedOn: '2026-12-15' }
    expect(policyState(terminated, 30, '2026-12-10')).toBe('active')
    expect(policyState(terminated, 30, '2026-12-16')).toBe('terminated')
  })
})

describe('coverage', () => {
  it('ends on the termination day', () => {
    const terminated = { ...year, terminatedOn: '2026-06-30' }
    expect(coversDay(terminated, '2026-06-30')).toBe(true)
    expect(coversDay(terminated, '2026-07-01')).toBe(false)
  })

  it('lets a new policy start the day after a termination', () => {
    const terminated = { ...year, terminatedOn: '2026-06-30' }
    const next = { startDate: '2026-07-01', endDate: '2027-06-30', terminatedOn: null }
    expect(periodsOverlap(terminated, next)).toBe(false)
    expect(periodsOverlap(year, next)).toBe(true)
  })
})

describe('policyIssues', () => {
  it('keeps the dates in order', () => {
    expect(policyIssues({ ...year, endDate: '2025-12-31' })).toEqual(['endBeforeStart'])
    expect(policyIssues({ ...year, terminatedOn: '2027-02-01' })).toEqual([
      'terminationOutsidePeriod'
    ])
    expect(policyIssues(year)).toEqual([])
  })
})
