import { describe, expect, it } from 'vitest'
import { circleContaining, distanceKm, pointBetween } from './geo'

const antananarivo = { latitude: -18.8792, longitude: 47.5079 }
const toamasina = { latitude: -18.1492, longitude: 49.4023 }

describe('distanceKm', () => {
  it('measures along the surface of the earth', () => {
    expect(distanceKm(antananarivo, toamasina)).toBeCloseTo(215.6, 1)
    expect(distanceKm(antananarivo, antananarivo)).toBe(0)
  })
})

describe('circleContaining', () => {
  it('keeps the closest circle that holds the point', () => {
    const point = { latitude: -18.88, longitude: 47.51 }
    const wide = { ...antananarivo, latitude: -18.9, radiusM: 10_000 }
    const close = { ...antananarivo, radiusM: 1_000 }
    expect(circleContaining(point, [wide, close])).toBe(close)
    expect(circleContaining(toamasina, [wide, close])).toBeUndefined()
  })
})

describe('pointBetween', () => {
  it('stays on the segment', () => {
    expect(pointBetween(antananarivo, toamasina, 0.5).latitude).toBeCloseTo(-18.5142, 4)
    expect(pointBetween(antananarivo, toamasina, 2)).toEqual(toamasina)
  })
})
