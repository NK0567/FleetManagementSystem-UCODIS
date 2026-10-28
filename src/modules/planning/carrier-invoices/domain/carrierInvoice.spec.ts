import { describe, expect, it } from 'vitest'
import { agreedTotal, carrierInvoiceStatus, validateIssue } from './carrierInvoice'

describe('carrier invoices', () => {
  it('derives the status and sums the agreed nets after withholdings', () => {
    expect(carrierInvoiceStatus({ validatedAt: null, refusedAt: null })).toBe('to_check')
    expect(carrierInvoiceStatus({ validatedAt: '2026-09-04T12:00:00', refusedAt: null })).toBe(
      'validated'
    )
    expect(carrierInvoiceStatus({ validatedAt: null, refusedAt: '2026-09-04T12:00:00' })).toBe(
      'refused'
    )
    expect(
      agreedTotal([
        { net: 1000, withholding: 200 },
        { net: 500, withholding: 0 }
      ])
    ).toEqual({ total: 1500, withholding: 200, untariffed: false })
    expect(agreedTotal([{ net: null, withholding: 0 }]).untariffed).toBe(true)
  })

  it('accepts the invoice inside the tolerance, and without a tariff only with a reason', () => {
    const base = {
      done: true,
      untariffed: false,
      amount: 1000,
      agreed: 1000,
      tolerance: 0,
      reason: ''
    }
    expect(validateIssue(base)).toBeNull()
    expect(validateIssue({ ...base, amount: 1010, tolerance: 5 })).toBe('outside')
    expect(validateIssue({ ...base, amount: 1010, tolerance: 10 })).toBeNull()
    expect(validateIssue({ ...base, done: false })).toBe('not_done')
    expect(validateIssue({ ...base, untariffed: true, agreed: null })).toBe('reason')
    expect(
      validateIssue({ ...base, untariffed: true, agreed: null, reason: 'Grille absente' })
    ).toBeNull()
  })
})
