import { describe, expect, it } from 'vitest'
import { emptyFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import {
  emptyQuality,
  followUpOpen,
  mainActor,
  protestQuantityAllowed,
  protestStatus,
  qualityFacts,
  responsibilityFrozen,
  settleImpacts,
  shareIssue,
  withholdingOf
} from './quality'

const line = () => ({
  ...emptyFollowUp(),
  ...emptyQuality(),
  quantity: 60,
  receivedQuantity: null as number | null
})

describe('delivery quality', () => {
  it('lists the facts that can ground a responsibility', () => {
    expect(qualityFacts(line())).toEqual([])
    expect(
      qualityFacts({
        ...line(),
        refusalAt: '2026-09-04T12:00:00',
        quantityGap: -10,
        satisfactionScore: 2,
        protests: [
          {
            no: 'NP-2026-0001',
            reasonNo: 'PRT-DAMAGE',
            comment: '',
            quantity: 1,
            preparedAt: '2026-09-04T12:00:00',
            preparedBy: 'FLT001',
            issuedAt: null,
            closedAt: null,
            outcome: ''
          }
        ]
      })
    ).toEqual(['refusal', 'quantity_gap', 'low_satisfaction', 'protest'])
  })

  it('derives the protest status and caps the quantity at what was loaded', () => {
    expect(protestStatus({ issuedAt: null, closedAt: null })).toBe('preparing')
    expect(protestStatus({ issuedAt: '2026-09-04T12:00:00', closedAt: null })).toBe('issued')
    expect(
      protestStatus({ issuedAt: '2026-09-04T12:00:00', closedAt: '2026-09-05T08:00:00' })
    ).toBe('closed')
    expect(protestQuantityAllowed(10, 60)).toBe(true)
    expect(protestQuantityAllowed(0, 60)).toBe(false)
    expect(protestQuantityAllowed(61, 60)).toBe(false)
  })

  it('keeps shares at 100 percent and recomputes the carrier withholding from the credit', () => {
    expect(
      shareIssue(
        [
          { actor: 'external_carrier', percent: 40 },
          { actor: 'external_carrier', percent: 60 }
        ],
        'carrier'
      )
    ).toBe('duplicate')
    expect(shareIssue([{ actor: 'external_carrier', percent: 100 }], 'fleet')).toBe('externalMeans')
    expect(shareIssue([{ actor: 'internal_carrier', percent: 100 }], 'carrier')).toBe(
      'internalMeans'
    )
    expect(
      shareIssue(
        [
          { actor: 'logistics', percent: 40 },
          { actor: 'orderer', percent: 50 }
        ],
        'fleet'
      )
    ).toBe('total')
    expect(
      shareIssue(
        [
          { actor: 'external_carrier', percent: 40 },
          { actor: 'orderer', percent: 60 }
        ],
        'carrier'
      )
    ).toBeNull()
    expect(
      mainActor([
        { actor: 'orderer', percent: 60 },
        { actor: 'external_carrier', percent: 40 }
      ])
    ).toBe('orderer')
    expect(withholdingOf(1000, 40)).toBe(400)
    expect(
      settleImpacts(
        [
          { type: 'customer_credit', amount: 1000 },
          { type: 'carrier_withholding', amount: 1 }
        ],
        40
      )
    ).toEqual([
      { type: 'customer_credit', amount: 1000 },
      { type: 'carrier_withholding', amount: 400 }
    ])
    expect(settleImpacts([{ type: 'carrier_withholding', amount: 50 }], 0)).toBe('withholding')
  })

  it('freezes the shares once the customer is invoiced or the carrier invoice is validated', () => {
    const open = emptyQuality()
    expect(responsibilityFrozen(open)).toBe(false)
    expect(responsibilityFrozen({ ...open, customerInvoicedAt: '2026-09-10T08:00:00' })).toBe(true)
    expect(
      responsibilityFrozen({ ...open, carrierInvoiceValidatedAt: '2026-09-10T08:00:00' })
    ).toBe(true)
    expect(followUpOpen({ cancelled: false, closed: false }, false)).toBe(true)
    expect(followUpOpen({ cancelled: true, closed: false }, false)).toBe(false)
    expect(followUpOpen({ cancelled: true, closed: false }, true)).toBe(true)
    expect(followUpOpen({ cancelled: false, closed: true }, true)).toBe(false)
  })
})
