import { describe, expect, it } from 'vitest'
import { emptyFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { linesDelivered, qualificationFits, receivedQuantityDecision } from './execution'

const rule = { no: 'TOL', customerNo: null, productNo: null, value: 2, unit: 'percent' as const }

describe('delivery execution', () => {
  it('settles a tour when every line is declared, refused or out of it', () => {
    const open = emptyFollowUp()
    expect(linesDelivered([open])).toBe(false)
    expect(linesDelivered([{ ...open, declaredAt: '2026-09-04T12:00:00' }])).toBe(true)
    expect(linesDelivered([{ ...open, postponedAt: '2026-09-04T12:00:00' }])).toBe(false)
    expect(linesDelivered([{ ...open, returnedAt: '2026-09-04T12:00:00' }])).toBe(true)
  })

  it('blocks an out-of-tolerance quantity only in block mode without a justification', () => {
    expect(receivedQuantityDecision(100, 90, rule, 'block', '')).toMatchObject({
      outside: true,
      blocked: true
    })
    expect(receivedQuantityDecision(100, 90, rule, 'block', 'fuite')).toMatchObject({
      blocked: false,
      gap: -10
    })
    expect(receivedQuantityDecision(100, 99, rule, 'block', '')).toMatchObject({
      outside: false,
      gap: null
    })
    expect(receivedQuantityDecision(100, 90, rule, 'flag', '')).toMatchObject({
      blocked: false,
      gap: -10
    })
  })

  it('accepts a gain only for a positive gap', () => {
    expect(qualificationFits(5, 'gain')).toBe(true)
    expect(qualificationFits(5, 'loss')).toBe(false)
    expect(qualificationFits(-5, 'loss')).toBe(true)
  })
})
