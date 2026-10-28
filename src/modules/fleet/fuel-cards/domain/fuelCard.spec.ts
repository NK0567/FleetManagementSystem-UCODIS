import { describe, expect, it } from 'vitest'
import { cardStatus, closestRefill, normalizeCardNumber, overruns } from './fuelCard'

const limits = {
  monthlyAmount: 1_000_000,
  monthlyVolumeL: 300,
  transactionsPerDay: 2,
  zones: ['Antananarivo', 'Toamasina'],
  startHour: 4,
  endHour: 21
}
const card = { expiresOn: '2027-06-30', blockedAt: null, limits }
const use = (no: string, transactedAt: string, liters = 100, city = 'Antananarivo') => ({
  no,
  transactedAt,
  city,
  liters,
  amount: liters * 5000
})

describe('fuel cards', () => {
  it('compare numbers without spaces', () => {
    expect(normalizeCardNumber('7089 1200 0001 4021')).toBe('7089120000014021')
  })

  it('derive their status from the block and the expiry', () => {
    expect(cardStatus({ blockedAt: null, expiresOn: '2027-01-01' }, '2026-09-04')).toBe('active')
    expect(
      cardStatus({ blockedAt: '2026-09-01T10:00:00Z', expiresOn: '2027-01-01' }, '2026-09-04')
    ).toBe('blocked')
    expect(cardStatus({ blockedAt: null, expiresOn: '2026-08-31' }, '2026-09-04')).toBe('expired')
  })
})

describe('overruns', () => {
  it('flag a transaction outside the zones or the hours', () => {
    const late = use('T1', '2026-09-02T22:40:00', 50, 'Antsirabe')
    expect(overruns(late, card, [late])).toEqual(['zone', 'hours'])
  })

  it('count the day and the month up to the transaction only', () => {
    const history = [
      use('T1', '2026-09-02T08:00:00'),
      use('T2', '2026-09-02T12:00:00'),
      use('T3', '2026-09-02T16:00:00')
    ]
    expect(overruns(history[1]!, card, history)).toEqual([])
    expect(overruns(history[2]!, card, history)).toEqual(['dailyCount', 'monthlyAmount'])
  })

  it('flag a use after the block or past the expiry', () => {
    const blocked = { ...card, blockedAt: '2026-09-01T12:00:00.000Z', expiresOn: '2026-09-01' }
    const after = use('T1', '2026-09-02T08:00:00')
    expect(overruns(after, blocked, [after])).toEqual(['expired', 'blocked'])
  })
})

describe('closestRefill', () => {
  const refills = [
    { no: 'R1', refueledAt: '2026-09-02T09:30:00', liters: 100 },
    { no: 'R2', refueledAt: '2026-09-02T08:10:00', liters: 101 },
    { no: 'R3', refueledAt: '2026-09-02T08:05:00', liters: 120 }
  ]

  it('takes the closest refill in time within the tolerances, not the first one', () => {
    expect(closestRefill(use('T1', '2026-09-02T08:00:00'), refills, 120, 2)?.no).toBe('R2')
  })

  it('finds nothing outside the tolerances', () => {
    expect(closestRefill(use('T1', '2026-09-03T08:00:00'), refills, 120, 2)).toBeNull()
  })
})
