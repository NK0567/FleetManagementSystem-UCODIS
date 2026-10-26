import { describe, expect, it } from 'vitest'
import { averageLeadTime, leadTimeDays, purchaseRequestStatus } from './purchaseRequest'

describe('purchase requests', () => {
  const blank = { orderedAt: null, receivedAt: null, cancelledAt: null }

  it('derive the status from the dates', () => {
    expect(purchaseRequestStatus(blank)).toBe('requested')
    expect(purchaseRequestStatus({ ...blank, orderedAt: '2026-08-01T09:00' })).toBe('ordered')
    expect(
      purchaseRequestStatus({
        ...blank,
        orderedAt: '2026-08-01T09:00',
        receivedAt: '2026-08-03T09:00'
      })
    ).toBe('received')
    expect(purchaseRequestStatus({ ...blank, cancelledAt: '2026-08-02T09:00' })).toBe('cancelled')
  })

  it('measure the lead time from order to receipt, and average it', () => {
    expect(leadTimeDays('2026-08-01T09:00', null)).toBeNull()
    expect(leadTimeDays('2026-08-01T09:00', '2026-08-03T21:00')).toBe(2.5)
    expect(averageLeadTime([2.5, null, 3.5])).toBe(3)
    expect(averageLeadTime([null])).toBeNull()
  })
})
