import { describe, expect, it } from 'vitest'
import { emptyFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { loadingReady, stillToLoad } from './loading'

const line = () => emptyFollowUp()

describe('loading control', () => {
  it('waits for a conforming check on every line still in the tour', () => {
    const staying = line()
    const aside = { ...line(), nonconformityAt: '2026-09-04T12:00:00' }
    expect(stillToLoad(aside)).toBe(false)
    expect(loadingReady([staying, aside])).toBe(false)
    expect(
      loadingReady([{ ...staying, loadedQuantity: 10, conformingAt: '2026-09-04T12:00:00' }, aside])
    ).toBe(true)
    // A non-conformity never blocks: once every line is checked, the order is ready (TRS03-US02 CA06).
    expect(loadingReady([aside])).toBe(true)
  })

  it('does not wait for a line that left the tour before the check', () => {
    const unavailable = { ...line(), unavailableAt: '2026-09-04T08:00:00' }
    expect(loadingReady([unavailable])).toBe(false)
    expect(
      loadingReady([
        unavailable,
        { ...line(), loadedQuantity: 5, conformingAt: '2026-09-04T12:00:00' }
      ])
    ).toBe(true)
  })
})
