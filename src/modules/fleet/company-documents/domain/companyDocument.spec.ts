import { describe, expect, it } from 'vitest'
import { decisionBlock, isRejectionReasonValid } from './companyDocument'

describe('decisionBlock', () => {
  it('lets someone else decide on a pending document', () => {
    expect(decisionBlock({ status: 'pending', createdBy: 'FLT001' }, 'ADM001')).toBeNull()
  })

  it('keeps the depositor from deciding on their own upload', () => {
    expect(decisionBlock({ status: 'pending', createdBy: 'FLT001' }, 'FLT001')).toBe('ownDocument')
  })

  it('decides only once', () => {
    expect(decisionBlock({ status: 'approved', createdBy: 'FLT001' }, 'ADM001')).toBe('notPending')
    expect(decisionBlock({ status: 'rejected', createdBy: 'FLT001' }, 'ADM001')).toBe('notPending')
  })
})

describe('isRejectionReasonValid', () => {
  it('needs an explanation of at least ten characters', () => {
    expect(isRejectionReasonValid('  Scan illisible ')).toBe(true)
    expect(isRejectionReasonValid('Flou')).toBe(false)
  })
})
