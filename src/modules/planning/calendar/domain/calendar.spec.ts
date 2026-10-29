import { describe, expect, it } from 'vitest'
import { addDays, overlappingKeys, weekStart } from './calendar'

describe('planning calendar', () => {
  it('flags the bookings of a row that overlap, not those that follow each other', () => {
    const keys = overlappingKeys([
      { key: 'a', start: '2026-10-22T08:00', end: '2026-10-22T12:00' },
      { key: 'b', start: '2026-10-22T12:00', end: '2026-10-22T15:00' },
      { key: 'c', start: '2026-10-22T11:00', end: '2026-10-22T13:00' }
    ])
    expect([...keys].sort()).toEqual(['a', 'b', 'c'])
    expect(
      overlappingKeys([
        { key: 'a', start: '2026-10-22T08:00', end: '2026-10-22T12:00' },
        { key: 'b', start: '2026-10-22T12:00', end: '2026-10-22T15:00' }
      ]).size
    ).toBe(0)
  })

  it('starts the week on Monday', () => {
    expect(weekStart('2026-10-28')).toBe('2026-10-26')
    expect(weekStart('2026-10-26')).toBe('2026-10-26')
    expect(addDays('2026-10-26', 7)).toBe('2026-11-02')
  })
})
