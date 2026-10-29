import { describe, expect, it } from 'vitest'
import {
  distanceToRouteM,
  expectedArrivals,
  lastReport,
  liveSituation,
  positionOnTrip,
  recordedTrack
} from './livePosition'

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

describe('corridor and recorded track', () => {
  const road = [
    { latitude: -18.9, longitude: 47.5 },
    { latitude: -18.9, longitude: 47.7 }
  ]

  it('measures the distance from the road, nothing to measure without a leg', () => {
    expect(distanceToRouteM({ latitude: -18.9, longitude: 47.6 }, road)).toBe(0)
    const away = distanceToRouteM({ latitude: -18.8, longitude: 47.6 }, road) ?? 0
    expect(away).toBeGreaterThan(11_000)
    expect(away).toBeLessThan(11_300)
    // Past the end of the road, the distance is to its last point.
    const beyond = distanceToRouteM({ latitude: -18.9, longitude: 47.8 }, road) ?? 0
    expect(beyond).toBeGreaterThan(10_000)
    expect(distanceToRouteM({ latitude: -18.9, longitude: 47.6 }, road.slice(0, 1))).toBeNull()
  })

  it('records a position every few minutes, none in a dead zone', () => {
    const arrivals = expectedArrivals(stops)
    const track = recordedTrack(stops, arrivals, '2026-09-04T06:10:00', '2026-09-04T07:10:00', [])
    expect(track).toHaveLength(7)
    expect(track[0]?.at).toBe('2026-09-04T06:10:00')
    const first = stops[0]!
    const silent = recordedTrack(stops, arrivals, '2026-09-04T06:10:00', '2026-09-04T07:10:00', [
      { latitude: first.latitude, longitude: first.longitude, radiusM: 1_000 }
    ])
    expect(silent.length).toBeLessThan(track.length)
  })
})
