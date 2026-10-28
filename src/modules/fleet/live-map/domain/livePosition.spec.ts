import { describe, expect, it } from 'vitest'
import { expectedArrivals, lastReport, liveSituation, positionOnTrip } from './livePosition'

const stops = [
  {
    latitude: -18.9,
    longitude: 47.5,
    plannedAt: '2026-09-04T06:00:00',
    passedAt: '2026-09-04T06:10:00',
    breakMin: 0
  },
  {
    latitude: -18.9,
    longitude: 48.5,
    plannedAt: '2026-09-04T08:00:00',
    passedAt: null,
    breakMin: 30
  },
  {
    latitude: -18.9,
    longitude: 49.5,
    plannedAt: '2026-09-04T10:30:00',
    passedAt: null,
    breakMin: 0
  }
]

describe('expectedArrivals', () => {
  it('carries the delay of the last stop passed to the stops ahead', () => {
    expect(expectedArrivals(stops)).toEqual([
      '2026-09-04T06:10:00',
      '2026-09-04T08:10:00',
      '2026-09-04T10:40:00'
    ])
  })
})

describe('positionOnTrip', () => {
  const arrivals = expectedArrivals(stops)

  it('moves along the leg being driven', () => {
    const fix = positionOnTrip(stops, arrivals, '2026-09-04T07:10:00')
    expect(fix).toMatchObject({ atStop: null, nextStop: 1 })
    expect(fix.longitude).toBeCloseTo(48, 5)
    expect(fix.speedKmh).toBe(53)
  })

  it('waits at a stop during its break, and at the last one for good', () => {
    expect(positionOnTrip(stops, arrivals, '2026-09-04T08:30:00')).toMatchObject({
      atStop: 1,
      nextStop: 2,
      speedKmh: 0
    })
    expect(positionOnTrip(stops, arrivals, '2026-09-04T12:00:00')).toMatchObject({
      atStop: 2,
      nextStop: null,
      longitude: 49.5
    })
  })
})

describe('lastReport', () => {
  const track = (at: string) => ({
    latitude: 0,
    longitude: Number(at.slice(14, 16)) / 10
  })
  const zone = { latitude: 0, longitude: 3, radiusM: 25_000 }

  it('goes back to the minute before the unit entered the dead zone', () => {
    const report = lastReport(track, '2026-09-04T10:31:00', [zone])
    expect(report.at).toBe('2026-09-04T10:27:00')
    expect(report.position.longitude).toBeCloseTo(2.7, 5)
  })

  it('reports in real time outside any dead zone', () => {
    expect(lastReport(track, '2026-09-04T10:10:00', [zone]).at).toBe('2026-09-04T10:10:00')
  })
})

describe('liveSituation', () => {
  it('puts a silent unit first, then an immobilized vehicle', () => {
    const base = { immobilized: false, signalLost: false, onTrip: true, moving: true }
    expect(liveSituation(base)).toBe('moving')
    expect(liveSituation({ ...base, moving: false })).toBe('stopped')
    expect(liveSituation({ ...base, onTrip: false })).toBe('parked')
    expect(liveSituation({ ...base, immobilized: true })).toBe('immobilized')
    expect(liveSituation({ ...base, immobilized: true, signalLost: true })).toBe('signal_lost')
  })
})
