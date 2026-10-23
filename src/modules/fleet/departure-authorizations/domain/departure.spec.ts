import { describe, expect, it } from 'vitest'
import { longestRestHours, readyToLeave, restBeforeHours } from './departure'

const departure = '2026-09-10T06:00:00'

describe('restBeforeHours', () => {
  it('counts from the end of the last trip', () => {
    const periods = [
      { start: '2026-09-08T06:00:00', end: '2026-09-08T16:00:00' },
      { start: '2026-09-09T06:00:00', end: '2026-09-09T20:00:00' }
    ]
    expect(restBeforeHours(periods, departure)).toBe(10)
    expect(restBeforeHours([], departure)).toBeNull()
  })
})

describe('longestRestHours', () => {
  it('finds the longest break over the seven days before the departure', () => {
    const periods = [
      { start: '2026-09-04T06:00:00', end: '2026-09-04T18:00:00' },
      { start: '2026-09-06T06:00:00', end: '2026-09-06T18:00:00' },
      { start: '2026-09-07T06:00:00', end: '2026-09-07T18:00:00' }
    ]
    // From 2026-09-07 18:00 to the departure on 2026-09-10 06:00.
    expect(longestRestHours(periods, departure)).toBe(60)
  })

  it('treats a driver who did not work as fully rested', () => {
    expect(longestRestHours([], departure)).toBe(168)
  })

  it('handles overlapping periods', () => {
    const periods = [
      { start: '2026-09-03T00:00:00', end: '2026-09-06T00:00:00' },
      { start: '2026-09-05T00:00:00', end: '2026-09-09T12:00:00' }
    ]
    expect(longestRestHours(periods, departure)).toBe(18)
  })
})

describe('readyToLeave', () => {
  it('needs every check to pass', () => {
    expect(readyToLeave([{ code: 'rest', ok: true, detail: '' }])).toBe(true)
    expect(
      readyToLeave([
        { code: 'rest', ok: true, detail: '' },
        { code: 'checklist', ok: false, detail: 'Aucune' }
      ])
    ).toBe(false)
  })
})
