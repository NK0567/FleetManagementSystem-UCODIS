import { describe, expect, it } from 'vitest'
import { alertStatus, isEscalated, isVisibleTo } from './alert'

const none = {
  acknowledgedBy: null,
  acknowledgedAt: null,
  handledBy: null,
  handledAt: null,
  comment: ''
}

describe('alertStatus', () => {
  it('follows what was done, and resolves when the signal goes away', () => {
    expect(alertStatus(true, null)).toBe('new')
    expect(alertStatus(true, { ...none, acknowledgedAt: '2026-09-04T08:00:00Z' })).toBe(
      'acknowledged'
    )
    expect(alertStatus(true, { ...none, handledAt: '2026-09-04T09:00:00Z' })).toBe('handled')
    expect(alertStatus(false, null)).toBe('resolved')
  })
})

describe('isEscalated', () => {
  const now = new Date('2026-09-04T10:00:00Z')

  it('escalates a new alert left past the delay of its rule', () => {
    expect(isEscalated('new', '2026-09-04T05:00:00Z', 4, now)).toBe(true)
    expect(isEscalated('new', '2026-09-04T07:00:00Z', 4, now)).toBe(false)
    expect(isEscalated('acknowledged', '2026-09-01T00:00:00Z', 4, now)).toBe(false)
  })
})

describe('isVisibleTo', () => {
  const audience = { recipients: ['FLEET_MANAGER'], escalateTo: 'MANAGEMENT' }

  it('shows an alert to its recipients, to the escalation profile once escalated, and to admins', () => {
    expect(isVisibleTo('FLEET_MANAGER', audience, false)).toBe(true)
    expect(isVisibleTo('MANAGEMENT', audience, false)).toBe(false)
    expect(isVisibleTo('MANAGEMENT', audience, true)).toBe(true)
    expect(isVisibleTo('ADMIN', audience, false)).toBe(true)
    expect(isVisibleTo('SALES', audience, true)).toBe(false)
  })
})
