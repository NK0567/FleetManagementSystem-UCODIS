import { beforeEach, describe, expect, it } from 'vitest'
import type { FuelCardTransactionApi } from '@/modules/fleet/fuel-card-transactions/types/fuelCardTransaction.types'
import type { FuelCardApi } from '@/modules/fleet/fuel-cards/types/fuelCard.types'
import type { FuelRefillApi } from '@/modules/fleet/fuel-refills/types/fuelRefill.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}) =>
  call(server, 'post', path, { as: 'FLT001', body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

async function transactions() {
  return (
    (
      await call(server, 'get', '/fleet/fuel-card-transactions', {
        as: 'FLT001',
        query: { pageSize: 100 },
        language: 'en'
      })
    ).data.data as { items: FuelCardTransactionApi[] }
  ).items
}

const card = (body: Record<string, unknown>) =>
  post('/fleet/fuel-cards', {
    number: '7089 1200 0009 9999',
    supplierNo: 'PRS-008',
    holderType: 'vehicle',
    vehicleNo: 'VEH-003',
    expiresOn: '2028-01-31',
    monthlyAmount: 10_000_000,
    ...body
  })

describe('fuel cards', () => {
  it('derive their status and their use this month', async () => {
    expect(await get<FuelCardApi>('/fleet/fuel-cards/CC-0005')).toMatchObject({
      status: 'blocked',
      blockReason: 'Véhicule hors service après accident'
    })
    const first = await get<FuelCardApi>('/fleet/fuel-cards/CC-0001')
    expect(first).toMatchObject({ status: 'active', holderName: '4021 TBA' })
    expect(first.usagePct).toBe(Math.round((first.monthAmount / 12_000_000) * 100))
  })

  it('keep one number per card and one active card per holder and supplier', async () => {
    expect((await card({})).status).toBe(201)
    expect((await card({ vehicleNo: 'VEH-006', number: '708912000009 9999' })).status).toBe(409)
    expect((await card({ number: '7089 0000 0000 0001' })).status).toBe(409)
    expect((await card({ supplierNo: 'PRS-001', vehicleNo: 'VEH-010' })).status).toBe(422)
    expect((await card({ vehicleNo: null, number: '7089 0000 0000 0002' })).status).toBe(422)
  })

  it('block with a reason, and never unblock an expired card', async () => {
    expect((await post('/fleet/fuel-cards/CC-0001/block')).status).toBe(422)
    expect(
      (await post('/fleet/fuel-cards/CC-0001/block', { reason: 'Carte perdue' })).data.data
    ).toMatchObject({
      status: 'blocked'
    })
    expect((await post('/fleet/fuel-cards/CC-0001/unblock')).data.data).toMatchObject({
      status: 'active'
    })
    await call(server, 'patch', '/fleet/fuel-cards/CC-0005', {
      as: 'FLT001',
      body: { expiresOn: '2026-08-31' }
    })
    expect((await post('/fleet/fuel-cards/CC-0005/unblock')).status).toBe(409)
  })
})

describe('card transactions', () => {
  it('flag what breaks the limits of the card', async () => {
    const items = await transactions()
    const codes = (no: string) => items.find((item) => item.no === no)?.overruns.map((o) => o.code)
    const late = items.find((item) => item.transactedAt.endsWith('22:40:00'))
    expect(late?.overruns.map((overrun) => overrun.code)).toEqual(['hours'])
    expect(items.find((item) => item.cardNo === 'CC-0005')?.overruns.map((o) => o.code)).toEqual([
      'blocked'
    ])
    expect(
      items
        .filter((item) => item.city === 'Antsirabe' && item.cardNo === 'CC-0002')
        .map((item) => codes(item.no))
    ).toEqual([['zone']])
  })

  it('match the closest refill, and leave a detached transaction alone', async () => {
    const before = await transactions()
    const waiting = before.find((item) => !item.refillNo && item.candidateNo && !item.matchMode)
    const detached = before.find((item) => item.matchMode === 'detached')
    expect(detached?.candidateNo).toBeTruthy()
    const matched = await post('/fleet/fuel-card-transactions/match-all')
    expect(matched.data.data).toEqual({ matched: 1 })
    const after = await transactions()
    expect(after.find((item) => item.no === waiting?.no)).toMatchObject({
      refillNo: waiting?.candidateNo,
      matchMode: 'auto'
    })
    expect(after.find((item) => item.no === detached?.no)?.refillNo).toBeNull()
    const refill = await get<FuelRefillApi>(`/fleet/fuel-refills/${waiting?.candidateNo}`)
    expect(refill.transactionNo).toBe(waiting?.no)
  })

  it('match by hand within the time tolerance, and detach', async () => {
    const detached = (await transactions()).find((item) => item.matchMode === 'detached')
    const no = detached?.no ?? ''
    expect(
      (await post(`/fleet/fuel-card-transactions/${no}/match`, { refillNo: 'RCH-00001' })).status
    ).toBe(422)
    const matched = await post(`/fleet/fuel-card-transactions/${no}/match`, {
      refillNo: detached?.candidateNo
    })
    expect(matched.data.data).toMatchObject({ matchMode: 'manual' })
    expect((await post(`/fleet/fuel-card-transactions/${no}/detach`)).data.data).toMatchObject({
      refillNo: null,
      matchMode: 'detached'
    })
  })

  it('turn an unmatched transaction into a refill of the card vehicle', async () => {
    const late = (await transactions()).find((item) => item.transactedAt.endsWith('22:40:00'))
    const response = await post(`/fleet/fuel-card-transactions/${late?.no}/refill`, {
      odometerKm: 165_800,
      fullTank: false
    })
    const transaction = response.data.data as FuelCardTransactionApi
    expect(transaction.matchMode).toBe('manual')
    expect(await get<FuelRefillApi>(`/fleet/fuel-refills/${transaction.refillNo}`)).toMatchObject({
      vehicleNo: 'VEH-002',
      channel: 'card',
      liters: 120,
      unitPrice: 5500,
      transactionNo: late?.no
    })
  })

  it('refuse a transaction imported twice', async () => {
    const entry = {
      cardNo: 'CC-0003',
      transactedAt: '2026-09-03T09:12',
      station: 'Station Jovena Antsirabe',
      city: 'Antsirabe',
      liters: 210,
      amount: 1_155_000
    }
    expect((await post('/fleet/fuel-card-transactions', entry)).status).toBe(201)
    expect((await post('/fleet/fuel-card-transactions', entry)).status).toBe(409)
  })
})
