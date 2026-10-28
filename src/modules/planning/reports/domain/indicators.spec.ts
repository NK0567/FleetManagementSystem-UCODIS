import { describe, expect, it } from 'vitest'
import {
  carrierIndicators,
  contestationRate,
  fillRate,
  inPerimeter,
  orderCost,
  punctualityRate
} from './indicators'

describe('planning indicators', () => {
  it('filters by depot or region and leaves an empty perimeter open', () => {
    const place = { siteNos: ['DEP-TNJ'], regions: ['Analamanga'] }
    expect(inPerimeter(null, place)).toBe(true)
    expect(inPerimeter({ depotNos: [], regions: [] }, place)).toBe(true)
    expect(inPerimeter({ depotNos: ['DEP-TNJ'], regions: [] }, place)).toBe(true)
    expect(inPerimeter({ depotNos: [], regions: ['Boeny'] }, place)).toBe(false)
    expect(inPerimeter({ depotNos: [], regions: ['Boeny'] }, { siteNos: [], regions: [] })).toBe(
      true
    )
  })

  it('computes each rate once', () => {
    expect(punctualityRate(3, 4)).toBe(75)
    expect(contestationRate(0, 0)).toBeNull()
    expect(fillRate(15000, 30000)).toBe(50)
    expect(fillRate(10, 0)).toBeNull()
    expect(orderCost({ carrierAmount: 604800, fuelCost: 10, distanceKm: 100, costPerKm: 5 })).toBe(
      604800
    )
    expect(orderCost({ carrierAmount: null, fuelCost: 1000, distanceKm: 168, costPerKm: 10 })).toBe(
      2680
    )
    expect(
      carrierIndicators({
        carrierNo: 'PRS-016',
        orders: 2,
        onTime: 1,
        arrived: 2,
        attested: 2,
        contested: 1,
        refused: 0,
        declared: 2,
        invoices: 1,
        invoicesOutside: 0,
        withoutTariff: 0
      }).punctuality
    ).toBe(50)
  })
})
