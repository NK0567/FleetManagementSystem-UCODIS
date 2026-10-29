import { describe, expect, it } from 'vitest'
import { canApply, kmGapPercent, missedStopCount, nextStopIndex, windowsOverlap } from './trip'

describe('canApply', () => {
  it('follows the life of a trip', () => {
    expect(canApply('start', 'planned')).toBe(true)
    expect(canApply('complete', 'planned')).toBe(false)
    expect(canApply('close', 'completed')).toBe(true)
    expect(canApply('cancel', 'in_progress')).toBe(false)
    expect(canApply('edit', 'in_progress')).toBe(false)
  })
})

describe('windowsOverlap', () => {
  const morning = { start: '2026-09-04T06:00:00', end: '2026-09-04T13:30:00' }

  it('detects shared time and ignores back-to-back trips', () => {
    expect(
      windowsOverlap(morning, { start: '2026-09-04T12:00:00', end: '2026-09-04T18:00:00' })
    ).toBe(true)
    expect(
      windowsOverlap(morning, { start: '2026-09-04T13:30:00', end: '2026-09-04T18:00:00' })
    ).toBe(false)
  })

  it('treats a trip on the road as open-ended', () => {
    expect(
      windowsOverlap(
        { start: '2026-09-04T06:00:00', end: null },
        { start: '2026-09-06T06:00:00', end: '2026-09-06T08:00:00' }
      )
    ).toBe(true)
  })
})

describe('kmGapPercent', () => {
  it('compares the distance driven with the route reference', () => {
    expect(kmGapPercent(378, 352)).toBe(7.4)
    expect(kmGapPercent(null, 352)).toBeNull()
  })
})

describe('nextStopIndex', () => {
  it('points to the first stop not passed, never to the last one', () => {
    expect(nextStopIndex([{ passedAt: 'x' }, { passedAt: null }, { passedAt: null }])).toBe(1)
    expect(nextStopIndex([{ passedAt: 'x' }, { passedAt: 'x' }, { passedAt: null }])).toBeNull()
  })
})

describe('missedStopCount', () => {
  const at = '2026-09-04T08:00:00'
  it('counts a stop left behind, and every unpassed stop once the trip has arrived', () => {
    const stops = [{ passedAt: at }, { passedAt: null }, { passedAt: at }, { passedAt: null }]
    expect(missedStopCount(stops, 'in_progress')).toBe(1)
    expect(missedStopCount(stops, 'completed')).toBe(2)
    expect(missedStopCount([{ passedAt: at }, { passedAt: null }], 'in_progress')).toBe(0)
  })
})
