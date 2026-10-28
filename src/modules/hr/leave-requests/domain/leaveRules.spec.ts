import { describe, expect, it } from 'vitest'
import {
  canDecide,
  countsAgainstBalance,
  decisionStatus,
  isDecisionCommentValid
} from './leaveRequestStatus'
import { computeLeaveBalance } from '../../leave-balances/domain/leaveBalance'

describe('leave request decisions', () => {
  it('only lets a pending request be decided', () => {
    expect(canDecide('pending')).toBe(true)
    expect(canDecide('approved')).toBe(false)
    expect(canDecide('rejected')).toBe(false)
    expect(canDecide('sent_back')).toBe(false)
  })

  it('maps each decision to its status', () => {
    expect(decisionStatus('approve')).toBe('approved')
    expect(decisionStatus('send-back')).toBe('sent_back')
    expect(decisionStatus('reject')).toBe('rejected')
  })

  it('requires a meaningful comment to send back or reject, not to approve', () => {
    expect(isDecisionCommentValid('approve', '')).toBe(true)
    expect(isDecisionCommentValid('reject', 'Too short')).toBe(false)
    expect(isDecisionCommentValid('reject', '   short   ')).toBe(false)
    expect(isDecisionCommentValid('send-back', 'Please give the trip number.')).toBe(true)
  })

  it('reserves days for pending and approved requests only', () => {
    expect(countsAgainstBalance('pending')).toBe(true)
    expect(countsAgainstBalance('approved')).toBe(true)
    expect(countsAgainstBalance('rejected')).toBe(false)
  })
})

describe('computeLeaveBalance', () => {
  it('deducts taken days from the entitlement, then pending days from what remains', () => {
    expect(
      computeLeaveBalance({
        entitlementDays: 30,
        carriedOverDays: 4,
        adjustmentDays: -2,
        takenDays: 10,
        pendingDays: 6
      })
    ).toMatchObject({ remainingDays: 22, availableDays: 16 })
  })

  it('can go negative so an overdraft stays visible', () => {
    expect(
      computeLeaveBalance({
        entitlementDays: 2,
        carriedOverDays: 0,
        adjustmentDays: 0,
        takenDays: 1,
        pendingDays: 3
      }).availableDays
    ).toBe(-2)
  })
})
