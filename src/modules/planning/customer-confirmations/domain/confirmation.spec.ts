import { describe, expect, it } from 'vitest'
import { confirmationState, linesConfirmed, lineOutOfTour, tacitlyConfirmed } from './confirmation'

const open = {
  confirmedAt: null,
  unavailableAt: null,
  replannedAt: null
}

describe('recipient confirmation', () => {
  it('keeps a line in the tour until the recipient is unavailable or the line is replanned', () => {
    expect(lineOutOfTour(open)).toBe(false)
    expect(lineOutOfTour({ ...open, unavailableAt: '2026-09-04T11:00:00' })).toBe(true)
    expect(confirmationState({ ...open, confirmedAt: '2026-09-04T11:00:00' })).toBe('confirmed')
    expect(confirmationState({ ...open, replannedAt: '2026-09-04T11:00:00' })).toBe('replanned')
  })

  it('confirms the order when every line still in the tour has answered', () => {
    expect(linesConfirmed([open])).toBe(false)
    expect(linesConfirmed([{ ...open, confirmedAt: '2026-09-04T11:00:00' }])).toBe(true)
    expect(linesConfirmed([{ ...open, unavailableAt: '2026-09-04T11:00:00' }])).toBe(true)
    expect(linesConfirmed([])).toBe(true)
  })

  it('counts silence after delivery as a confirmation only once the delay has passed', () => {
    expect(tacitlyConfirmed(null, '2026-09-10', 3)).toBe(false)
    expect(tacitlyConfirmed('2026-09-04', '2026-09-06', 3)).toBe(false)
    expect(tacitlyConfirmed('2026-09-04', '2026-09-07', 3)).toBe(true)
    expect(tacitlyConfirmed('2026-09-04', '2026-09-20', null)).toBe(false)
  })
})
