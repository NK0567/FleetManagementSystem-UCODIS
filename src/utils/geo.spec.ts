import { describe, expect, it } from 'vitest'
import { distanceKm } from './geo'

describe('distanceKm', () => {
  it('measures along the surface of the earth', () => {
    const antananarivo = { latitude: -18.8792, longitude: 47.5079 }
    const toamasina = { latitude: -18.1492, longitude: 49.4023 }
    expect(distanceKm(antananarivo, toamasina)).toBeCloseTo(215.6, 1)
    expect(distanceKm(antananarivo, antananarivo)).toBe(0)
  })
})
