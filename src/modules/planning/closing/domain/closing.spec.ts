import { describe, expect, it } from 'vitest'
import { emptyFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { emptyQuality } from '@/modules/planning/delivery-quality/domain/quality'
import {
  closingBlocks,
  debriefingIssue,
  gainLossText,
  requiredDocumentKinds,
  type ClosingLine
} from './closing'

const line = (): ClosingLine => ({ ...emptyFollowUp(), ...emptyQuality() })

const order = (lines: ClosingLine[], delivered = true) => ({
  delivered,
  lines,
  today: '2026-09-04',
  tacitDays: 3,
  documentKinds: ['loading_list', 'delivery_note'],
  requiredKinds: ['loading_list', 'delivery_note']
})

describe('closing', () => {
  it('blocks a delivery that is not attested, unless the tacit delay has passed', () => {
    const declared = { ...line(), declaredAt: '2026-09-04T11:00:00' }
    expect(closingBlocks(order([declared]))).toEqual(['reception'])
    expect(closingBlocks(order([{ ...declared, receptionConfirmedAt: '2026-09-04T12:00:00' }]))).toEqual([])
    expect(closingBlocks(order([{ ...declared, declaredAt: '2026-09-01T11:00:00' }]))).toEqual([])
    expect(
      closingBlocks(
        order([{ ...declared, declaredAt: '2026-09-01T11:00:00', receptionContestedAt: '2026-09-02T08:00:00' }])
      )
    ).toEqual(['contestation'])
  })

  it('blocks an open protest, an unqualified gap and a missing document', () => {
    const ready = { ...line(), declaredAt: '2026-09-01T11:00:00', quantityGap: -4, gapQualification: null as const }
    expect(closingBlocks(order([ready]))).toContain('gap')
    const protested = {
      ...line(),
      declaredAt: '2026-09-01T11:00:00',
      protests: [{ issuedAt: '2026-09-02T08:00:00', closedAt: null }]
    }
    expect(closingBlocks(order([protested]))).toContain('protest')
    expect(closingBlocks({ ...order([line()]), documentKinds: ['loading_list'] })).toEqual(['document'])
    expect(closingBlocks({ ...order([]), delivered: false, requiredKinds: [] })).toEqual(['not_delivered'])
  })

  it('reads the required documents and refuses a debriefing without a vehicle or a voucher', () => {
    expect(requiredDocumentKinds('Loading_List, delivery_note, loading_list, -')).toEqual([
      'loading_list',
      'delivery_note'
    ])
    expect(debriefingIssue({ voucherNo: '', loadedAt: '', unloadedAt: '', observations: '' }, '4021 TBA')).toBe(
      'voucher'
    )
    expect(debriefingIssue({ voucherNo: 'BL-1', loadedAt: '', unloadedAt: '', observations: '' }, '')).toBe(
      'vehicle'
    )
    expect(
      debriefingIssue(
        { voucherNo: 'BL-1', loadedAt: '2026-09-04T12:00', unloadedAt: '2026-09-04T08:00', observations: '' },
        '4021 TBA'
      )
    ).toBe('dates')
    expect(gainLossText([{ quantityGap: -4, gapQualification: 'loss' }])).toBe('loss -4')
  })
})
