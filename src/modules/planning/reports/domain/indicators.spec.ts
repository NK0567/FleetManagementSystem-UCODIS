import { describe, expect, it } from 'vitest'
import {
  arrivedOnTime,
  averageScore,
  carrierIndicators,
  delayMinutes,
  deliveryOutcomes,
  fuelGapSummary,
  groupRates,
  invoiceGap,
  lateKind,
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
        partial: 0,
        declared: 2,
        invoices: 1,
        invoicesOutside: 0,
        withoutTariff: 0,
        invoiceGap: 0
      }).punctuality
    ).toBe(50)
  })
})

describe('transport indicators', () => {
  it('counts a delivery on time within the margin', () => {
    expect(delayMinutes('2026-09-04T10:40:00', '2026-09-04T10:00:00')).toBe(40)
    expect(arrivedOnTime('2026-09-04T10:30:00', '2026-09-04T10:00:00', 30)).toBe(true)
    expect(arrivedOnTime('2026-09-04T10:31:00', '2026-09-04T10:00:00', 30)).toBe(false)
    expect(
      groupRates([
        { key: 'b', label: 'B', onTime: true },
        { key: 'a', label: 'A', onTime: false },
        { key: 'b', label: 'B', onTime: false }
      ])
    ).toEqual([
      { key: 'a', label: 'A', onTime: 0, total: 1, rate: 0 },
      { key: 'b', label: 'B', onTime: 1, total: 2, rate: 50 }
    ])
  })

  it('says an order is late only when it should have left or arrived', () => {
    const order = {
      status: 'planned',
      plannedDeparture: '2026-09-04T08:00:00',
      plannedArrival: '2026-09-04T12:00:00',
      delivered: false
    }
    expect(lateKind(order, '2026-09-04T08:20:00', 30)).toBeNull()
    expect(lateKind(order, '2026-09-04T09:00:00', 30)).toBe('departure')
    expect(lateKind({ ...order, status: 'in_progress' }, '2026-09-04T13:00:00', 30)).toBe('arrival')
    expect(
      lateKind({ ...order, status: 'in_progress', delivered: true }, '2026-09-04T13:00:00', 30)
    ).toBeNull()
    expect(lateKind({ ...order, status: 'completed' }, '2026-09-05T13:00:00', 30)).toBeNull()
  })

  it('sorts the outcomes of the deliveries and the fuel gaps', () => {
    const base = {
      declaredAt: null,
      refusalAt: null,
      postponedAt: null,
      returnedAt: null,
      receptionContestedAt: null,
      receivedQuantity: null,
      reference: 10,
      attested: false
    }
    expect(
      deliveryOutcomes([
        base,
        { ...base, declaredAt: 'x', receivedQuantity: 8, attested: true },
        { ...base, refusalAt: 'x', returnedAt: 'x' },
        { ...base, postponedAt: 'x' }
      ])
    ).toEqual({
      concerned: 3,
      confirmed: 1,
      partial: 1,
      refused: 1,
      postponed: 1,
      contested: 0,
      returned: 1
    })
    expect(
      fuelGapSummary([
        { gap: 5, qualification: 'gain' },
        { gap: -3, qualification: 'loss' },
        { gap: -2, qualification: null },
        { gap: 0, qualification: null }
      ])
    ).toEqual({ gainCount: 1, gainVolume: 5, lossCount: 1, lossVolume: 3, unqualified: 1 })
    expect(averageScore([])).toBeNull()
    expect(averageScore([4, 5, 5])).toBe(4.7)
    expect(invoiceGap(1200, 1000)).toBe(200)
    expect(invoiceGap(1200, null)).toBeNull()
  })
})
