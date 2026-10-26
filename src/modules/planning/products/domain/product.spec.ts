import { describe, expect, it } from 'vitest'
import { productNeedsDensity, withFuelFields } from './product'

describe('product fuel fields', () => {
  it('require a density for a fuel only', () => {
    const fuel = { isFuel: true, referenceDensity: null, expansionCoefficient: null }
    expect(productNeedsDensity(fuel)).toBe(true)
    expect(productNeedsDensity({ ...fuel, referenceDensity: 0.845 })).toBe(false)
    expect(productNeedsDensity({ ...fuel, isFuel: false })).toBe(false)
  })

  it('drop the fuel measures of a product that is not a fuel', () => {
    const product = { isFuel: false, referenceDensity: 0.8, expansionCoefficient: 0.001 }
    expect(withFuelFields(product)).toEqual({
      isFuel: false,
      referenceDensity: null,
      expansionCoefficient: null
    })
  })
})
