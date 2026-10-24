import { describe, expect, it } from 'vitest'
import { belowThreshold, telematicsEventStatus } from './telematicsEvent'

describe('telematicsEventStatus', () => {
  it('follows the handling', () => {
    expect(telematicsEventStatus({ acknowledgedAt: null, infractionNo: null })).toBe('new')
    expect(telematicsEventStatus({ acknowledgedAt: '2026-09-01T10:00', infractionNo: null })).toBe(
      'acknowledged'
    )
    expect(telematicsEventStatus({ acknowledgedAt: null, infractionNo: 'INF-2026-001' })).toBe(
      'infraction'
    )
  })
})

describe('belowThreshold', () => {
  it('only judges a measured value against a set threshold', () => {
    expect(belowThreshold(85, 90)).toBe(true)
    expect(belowThreshold(90, 90)).toBe(false)
    expect(belowThreshold(null, 90)).toBe(false)
    expect(belowThreshold(85, null)).toBe(false)
  })
})
