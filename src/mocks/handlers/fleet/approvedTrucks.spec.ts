import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown>) =>
  call(server, 'post', path, { as: 'FLT001', body, language: 'en' })

const refill = (vehicleNo: string, paymentMode: string, odometerKm: number) => ({
  vehicleNo,
  stationSiteNo: 'STA-AMB',
  refueledAt: '2026-09-01T08:00:00',
  liters: 100,
  unitPrice: 5000,
  odometerKm,
  fullTank: false,
  paymentMode
})

describe('refills outside a card at a station with a list of approved trucks', () => {
  it('refuse a truck that is not on the list, but not a card payment', async () => {
    const refused = await post('/fleet/fuel-refills', refill('VEH-004', 'cash', 190_001))
    expect(refused.status).toBe(422)
    const card = await post('/fleet/fuel-refills', refill('VEH-004', 'card', 190_002))
    expect(card.status).not.toBe(422)
  })

  it('accept an approved truck', async () => {
    const accepted = await post('/fleet/fuel-refills', refill('VEH-001', 'station_credit', 190_003))
    expect(accepted.status).toBe(201)
  })
})
