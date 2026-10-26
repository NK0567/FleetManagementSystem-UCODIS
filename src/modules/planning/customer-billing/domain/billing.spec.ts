import { describe, expect, it } from 'vitest'
import { emptyFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { billIssue, billedCustomer, flatShare, netAmount } from './billing'
import type { TariffAmount } from '@/modules/planning/transport-tariffs/domain/transportTariff'

const tariff = { amount: 1_800_000 } as TariffAmount
const line = () => ({ ...emptyFollowUp(), declaredAt: '2026-09-01T11:00:00' })

describe('customer billing', () => {
  it('invoices the payer, and skips an internal department', () => {
    expect(
      billedCustomer({
        freightPayer: 'orderer',
        ordererNo: 'CLI-002',
        ordererInternal: false,
        recipientNo: 'CLI-006',
        recipientInternal: false
      })
    ).toBe('CLI-002')
    expect(
      billedCustomer({
        freightPayer: 'recipient',
        ordererNo: 'CLI-002',
        ordererInternal: false,
        recipientNo: 'CLI-006',
        recipientInternal: false
      })
    ).toBe('CLI-006')
    expect(
      billedCustomer({
        freightPayer: 'orderer',
        ordererNo: 'CLI-004',
        ordererInternal: true,
        recipientNo: 'CLI-006',
        recipientInternal: false
      })
    ).toBe('internal')
  })

  it('refuses a line that is not attested, contested or outside tolerance', () => {
    expect(
      billIssue({ ...line(), declaredAt: '2026-09-04T11:00:00' }, '2026-09-04', 3, tariff)
    ).toBe('reception')
    expect(billIssue(line(), '2026-09-04', 3, tariff)).toBeNull()
    expect(
      billIssue({ ...line(), receptionContestedAt: '2026-09-02T08:00:00' }, '2026-09-04', 3, tariff)
    ).toBe('contestation')
    expect(
      billIssue({ ...line(), quantityGap: -4, gapQualification: null }, '2026-09-04', 3, tariff)
    ).toBe('gap')
    expect(billIssue(line(), '2026-09-04', 3, null)).toBe('tariff')
    expect(billIssue({ ...line(), declaredAt: null }, '2026-09-04', 3, tariff)).toBe(
      'not_delivered'
    )
  })

  it('splits one flat rate and lets the last delivery take the remainder', () => {
    const parts = [
      { key: '1', invoicedShare: null },
      { key: '2', invoicedShare: null },
      { key: '3', invoicedShare: null }
    ]
    expect(flatShare(100, parts, '1')).toBe(33)
    expect(flatShare(100, parts, '3')).toBe(34)
    expect(
      flatShare(
        100,
        [
          { key: '1', invoicedShare: 33 },
          { key: '2', invoicedShare: null }
        ],
        '2'
      )
    ).toBe(67)
    expect(netAmount(1_800_000, 200_000)).toBe(1_600_000)
    expect(netAmount(100, 250)).toBe(0)
  })
})
