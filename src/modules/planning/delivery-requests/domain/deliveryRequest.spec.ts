import { describe, expect, it } from 'vitest'
import {
  canCancel,
  canReject,
  deliveryRequestIssues,
  deliveryRequestStatus,
  isEditable
} from './deliveryRequest'

const TODAY = '2026-09-04'
const pending = { cancelledAt: null, rejectedAt: null, transportOrderNo: null, validUntil: null }

describe('delivery request status', () => {
  it('reads the status from the facts', () => {
    expect(deliveryRequestStatus(pending, TODAY)).toBe('pending')
    expect(deliveryRequestStatus({ ...pending, validUntil: '2026-09-03' }, TODAY)).toBe('expired')
    expect(deliveryRequestStatus({ ...pending, validUntil: TODAY }, TODAY)).toBe('pending')
    expect(deliveryRequestStatus({ ...pending, rejectedAt: '2026-09-02T10:00' }, TODAY)).toBe(
      'rejected'
    )
    const planned = { ...pending, transportOrderNo: 'TR-2026-0001', validUntil: '2026-09-01' }
    expect(deliveryRequestStatus(planned, TODAY)).toBe('planned')
    expect(deliveryRequestStatus({ ...planned, cancelledAt: '2026-09-03T08:00' }, TODAY)).toBe(
      'cancelled'
    )
  })

  it('lets a request be corrected, rejected or cancelled only before it is planned', () => {
    expect(isEditable('rejected')).toBe(true)
    expect(isEditable('planned')).toBe(false)
    expect(canReject('rejected')).toBe(false)
    expect(canReject('expired')).toBe(true)
    expect(canCancel('cancelled')).toBe(false)
  })

  it('wants a desired date ahead and a validity after it', () => {
    expect(deliveryRequestIssues({ desiredDate: '2026-09-03', validUntil: null }, TODAY)).toEqual([
      'desiredDateInPast'
    ])
    expect(
      deliveryRequestIssues({ desiredDate: '2026-09-10', validUntil: '2026-09-08' }, TODAY)
    ).toEqual(['validityBeforeDesiredDate'])
  })
})
