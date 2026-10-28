import { describe, expect, it } from 'vitest'
import { emptyFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import {
  canHandBack,
  canReceiveReturn,
  receptionAttested,
  remainderQuantity,
  returnExpected
} from './reception'

const line = () => ({ ...emptyFollowUp(), quantity: 60, receivedQuantity: null as number | null })

describe('reception', () => {
  it('attests an explicit confirmation and, after the delay, a silent one', () => {
    const declared = { ...line(), declaredAt: '2026-09-01T10:00:00' }
    expect(receptionAttested(declared, '2026-09-03', 3)).toBe(false)
    expect(receptionAttested(declared, '2026-09-04', 3)).toBe(true)
    expect(receptionAttested(declared, '2026-09-20', null)).toBe(false)
    expect(
      receptionAttested(
        { ...declared, receptionConfirmedAt: '2026-09-01T12:00:00' },
        '2026-09-01',
        3
      )
    ).toBe(true)
    expect(
      receptionAttested(
        { ...declared, receptionContestedAt: '2026-09-02T08:00:00' },
        '2026-09-20',
        3
      )
    ).toBe(false)
    expect(receptionAttested(line(), '2026-09-20', 3)).toBe(false)
  })

  it('sends the missing quantity back to the pool once, and expects a refusal home', () => {
    const declared = {
      ...line(),
      declaredAt: '2026-09-04T11:00:00',
      loadedQuantity: 60,
      receivedQuantity: 50
    }
    expect(remainderQuantity(declared)).toBe(10)
    expect(remainderQuantity({ ...declared, receivedQuantity: 60 })).toBeNull()
    expect(remainderQuantity({ ...declared, remainderAt: '2026-09-04T12:00:00' })).toBeNull()
    const refused = { ...line(), refusalAt: '2026-09-04T11:00:00' }
    expect(returnExpected(refused)).toBe(true)
    expect(canHandBack(refused)).toBe(true)
    expect(canReceiveReturn(refused)).toBe(true)
    expect(canHandBack({ ...refused, warehouseReceivedAt: '2026-09-04T15:00:00' })).toBe(false)
    expect(canReceiveReturn({ ...refused, warehouseReceivedAt: '2026-09-04T15:00:00' })).toBe(false)
    expect(returnExpected(declared)).toBe(false)
  })
})
