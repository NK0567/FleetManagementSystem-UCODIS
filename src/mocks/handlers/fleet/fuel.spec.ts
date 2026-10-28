import { beforeEach, describe, expect, it } from 'vitest'
import type {
  FuelConsumptionApi,
  FuelConsumptionSummary
} from '@/modules/fleet/fuel-consumption/types/fuelConsumption.types'
import type { FuelRefillApi } from '@/modules/fleet/fuel-refills/types/fuelRefill.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function list<T>(path: string, as = 'FLT001') {
  return (
    (await call(server, 'get', path, { as, query: { pageSize: 200 }, language: 'en' })).data
      .data as {
      items: T[]
    }
  ).items
}

const post = (path: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', path, { as, body, language: 'en' })

const failed = (refill: FuelRefillApi) =>
  refill.checks.filter((check) => !check.ok).map((check) => check.code)

describe('fuel refills', () => {
  it('check each refill and flag the anomalies', async () => {
    const refills = await list<FuelRefillApi>('/fleet/fuel-refills')
    const anomalies = refills.filter((refill) => refill.status === 'anomaly')
    expect(anomalies.map((refill) => [refill.vehiclePlate, failed(refill)])).toEqual(
      expect.arrayContaining([
        [expect.any(String), ['tank']],
        [expect.any(String), ['hours']],
        [expect.any(String), ['gps']]
      ])
    )
    expect(anomalies).toHaveLength(3)
    const oversized = anomalies.find((refill) => failed(refill).includes('tank'))
    expect(oversized?.checks.find((check) => check.code === 'tank')?.detail).toBe(
      '545 L for a 500 L tank'
    )
  })

  it('find the driver of the day, and refuse the same refill twice', async () => {
    const refill = {
      refueledAt: '2026-09-03T11:00',
      vehicleNo: 'VEH-001',
      liters: 280,
      unitPrice: 5500,
      odometerKm: 182_380,
      fullTank: true,
      stationSiteNo: 'DEP-TNJ'
    }
    const created = await post('/fleet/fuel-refills', refill)
    expect(created.status).toBe(201)
    expect(created.data.data).toMatchObject({
      driverNo: 'UCT-010',
      amount: 1_540_000,
      status: 'valid'
    })
    const twin = await post('/fleet/fuel-refills', { ...refill, refueledAt: '2026-09-03T11:05' })
    expect(twin.status).toBe(409)
    expect(
      (await post('/fleet/fuel-refills', { ...refill, refueledAt: '2026-09-05T08:00' })).status
    ).toBe(422)
  })

  it('qualify an anomaly only, with a cause and a comment', async () => {
    const refills = await list<FuelRefillApi>('/fleet/fuel-refills')
    const night = refills.find((refill) => failed(refill).includes('hours'))
    const valid = refills.find((refill) => refill.status === 'valid')
    const qualify = (no: string, body: Record<string, unknown>) =>
      post(`/fleet/fuel-refills/${no}/qualify`, body)
    expect((await qualify(valid?.no ?? '', { causeNo: 'ROUTE', comment: 'x' })).status).toBe(409)
    expect((await qualify(night?.no ?? '', { causeNo: 'ROUTE' })).status).toBe(422)
    const qualified = await qualify(night?.no ?? '', {
      causeNo: 'ROUTE',
      comment: 'Départ de nuit pour livrer Toamasina avant la fermeture.'
    })
    expect(qualified.data.data).toMatchObject({ status: 'qualified' })
    const edit = await call(server, 'patch', `/fleet/fuel-refills/${night?.no}`, {
      as: 'FLT001',
      body: { liters: 1 }
    })
    expect(edit.status).toBe(409)
  })
})

describe('fuel consumption', () => {
  it('measures full-to-full periods against the reference and flags the gaps', async () => {
    const periods = await list<FuelConsumptionApi>('/fleet/fuel-consumption')
    const toQualify = periods.filter((period) => period.status === 'to_qualify')
    expect(toQualify).toHaveLength(1)
    expect(toQualify[0]).toMatchObject({
      vehicleNo: 'VEH-002',
      l100: 42.5,
      referenceL100: 37,
      referenceSource: 'vehicleType',
      gapPct: 14.9
    })
    expect(periods.find((period) => period.status === 'deduction_proposed')).toMatchObject({
      vehicleNo: 'VEH-003',
      proposedAmount: 50_000,
      proposedBy: 'FLT001'
    })
  })

  it('gives one average: total litres over total distance', async () => {
    const periods = await list<FuelConsumptionApi>('/fleet/fuel-consumption')
    const km = periods.reduce((total, period) => total + period.km, 0)
    const liters = periods.reduce((total, period) => total + period.liters, 0)
    const summary = (await call(server, 'get', '/fleet/fuel-consumption/summary', { as: 'FLT001' }))
      .data.data as FuelConsumptionSummary
    expect(summary.averageL100).toBe(Math.round((liters / km) * 1000) / 10)
    expect(summary).toMatchObject({ refillsToQualify: 3, gapsToQualify: 1 })
  })

  it('charge a deduction only for a chargeable cause, within the excess cost and the cap', async () => {
    const gap = (await list<FuelConsumptionApi>('/fleet/fuel-consumption')).find(
      (period) => period.status === 'to_qualify'
    ) as FuelConsumptionApi
    const act = (action: string, body: Record<string, unknown>, as = 'FLT001') =>
      post(`/fleet/fuel-consumption/${encodeURIComponent(gap.no)}/${action}`, body, as)

    expect((await act('propose', { amount: 1000 })).status).toBe(409)
    await act('qualify', { causeNo: 'TECHNICAL', comment: 'Injecteur à contrôler.' })
    expect((await act('propose', { amount: 1000 })).status).toBe(422)
  })

  it('needs a second person to decide a deduction', async () => {
    const proposed = (await list<FuelConsumptionApi>('/fleet/fuel-consumption')).find(
      (period) => period.status === 'deduction_proposed'
    ) as FuelConsumptionApi
    const decide = (body: Record<string, unknown>, as: string) =>
      post(`/fleet/fuel-consumption/${encodeURIComponent(proposed.no)}/decide`, body, as)
    expect((await decide({ approve: true }, 'FLT001')).status).toBe(403)
    expect((await decide({ approve: false }, 'ADM001')).status).toBe(422)
    expect((await decide({ approve: true, comment: 'Validé' }, 'ADM001')).data.data).toMatchObject({
      status: 'deduction_approved',
      decidedBy: 'ADM001'
    })
  })

  it('caps a deduction at the excess cost and at the set cap', async () => {
    const gap = (await list<FuelConsumptionApi>('/fleet/fuel-consumption')).find(
      (period) => period.status === 'to_qualify'
    ) as FuelConsumptionApi
    const act = (action: string, body: Record<string, unknown>) =>
      post(`/fleet/fuel-consumption/${encodeURIComponent(gap.no)}/${action}`, body)
    await act('qualify', { causeNo: 'DRIVING', comment: 'Ralenti prolongé.' })
    expect((await act('propose', { amount: gap.excessCost + 1 })).status).toBe(422)
    expect((await act('propose', { amount: 250_000 })).status).toBe(422)
    expect((await act('propose', { amount: 40_000 })).data.data).toMatchObject({
      status: 'deduction_proposed'
    })
  })
})
