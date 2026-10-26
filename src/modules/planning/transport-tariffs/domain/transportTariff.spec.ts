import { describe, expect, it } from 'vitest'
import {
  applicableTariff,
  sameGrid,
  tariffIssues,
  type TariffRule,
  type TariffedService
} from './transportTariff'

const rule = (no: string, values: Partial<TariffRule>): TariffRule => ({
  no,
  target: 'carrier',
  customerNo: null,
  carrierNo: 'PRS-017',
  basis: 'distance',
  price: 3_600,
  routeTemplateNo: null,
  family: '',
  productNo: null,
  active: true,
  ...values
})

const perKm = rule('TRF-001', {})
const flatRoute = rule('TRF-002', {
  basis: 'route_template',
  routeTemplateNo: 'TNR-TOA',
  price: 2_400_000
})
const fuelPerLitre = rule('TRF-003', { basis: 'quantity', family: 'Carburant', price: 45 })

const service: TariffedService = {
  target: 'carrier',
  partyNo: 'PRS-017',
  routeTemplateNo: 'TNR-ATS',
  distanceKm: 168,
  quantity: 30_000,
  weightKg: null,
  productNo: 'PRD-006',
  family: 'carburant'
}

describe('transport tariff', () => {
  it('prefers the rule aimed at the goods, then a flat route rate', () => {
    expect(applicableTariff([perKm, flatRoute, fuelPerLitre], service)).toMatchObject({
      rule: fuelPerLitre,
      base: 30_000,
      amount: 1_350_000
    })
    const onRoute = { ...service, routeTemplateNo: 'TNR-TOA', family: null }
    expect(applicableTariff([perKm, flatRoute, fuelPerLitre], onRoute)).toMatchObject({
      rule: flatRoute,
      base: 1,
      amount: 2_400_000
    })
  })

  it('prices per kilometre on the reference distance and per tonne', () => {
    const general = { ...service, family: null }
    expect(applicableTariff([perKm, flatRoute], general)?.amount).toBe(604_800)
    const perTonne = rule('TRF-004', { basis: 'weight', price: 95_000 })
    expect(applicableTariff([perTonne], { ...general, weightKg: 12_500 })?.amount).toBe(1_187_500)
  })

  it('finds nothing without an active rule that has its base', () => {
    expect(applicableTariff([{ ...perKm, active: false }], service)).toBeNull()
    expect(applicableTariff([perKm], { ...service, distanceKm: null, family: null })).toBeNull()
    expect(applicableTariff([perKm], { ...service, partyNo: 'PRS-016' })).toBeNull()
  })

  it('checks the party and the route, and spots a duplicate grid', () => {
    expect(tariffIssues({ ...flatRoute, carrierNo: null, routeTemplateNo: null })).toEqual([
      'partyMissing',
      'routeNeeded'
    ])
    expect(sameGrid(fuelPerLitre, { ...fuelPerLitre, family: ' CARBURANT ', price: 50 })).toBe(true)
    expect(sameGrid(fuelPerLitre, { ...fuelPerLitre, productNo: 'PRD-006' })).toBe(false)
  })
})
