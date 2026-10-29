import { beforeEach, describe, expect, it } from 'vitest'
import type { LoadingPreparationApi } from '@/modules/planning/loading-preparations/types/loadingPreparation.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const BASE = '/planning/loading-preparations'
const send = (
  method: 'post' | 'patch' | 'put',
  url: string,
  body: Record<string, unknown>,
  as = 'LIV001'
) => call(server, method, url, { as, body, language: 'en' })

const header = (vehicles: string[]) => ({
  depotSiteNo: 'DEP-ALR',
  loadingDate: '2026-09-06',
  validUntil: '2026-09-07',
  region: 'Analamanga',
  requestNos: ['DL-2026-0004', 'DL-2026-0020', 'DL-2026-0021'],
  vehicles: vehicles.map((vehicleNo) => ({ vehicleNo, trailerNo: null, driverNo: null }))
})

async function create(vehicles = ['VEH-022', 'VEH-023']) {
  const created = await send('post', BASE, header(vehicles))
  expect(created.status).toBe(200)
  return created.data.data as LoadingPreparationApi
}

describe('loading preparation', () => {
  it('is created pending by the delivery manager, with the totals to compare', async () => {
    expect((await send('post', BASE, header(['VEH-022']), 'PLN001')).status).toBe(403)
    const prep = await create()
    expect(prep.status).toBe('pending')
    expect(prep.totals.quantityL).toBe(39000)
    expect(prep.totals.capacityL).toBe(33000 + 30000)
    // An order already held by a pending preparation is not taken twice.
    expect((await send('post', BASE, header(['VEH-024']))).status).toBe(409)
  })

  it('says why the sharing is not possible: capacity, then what is left to share', async () => {
    const prep = await create(['VEH-023'])
    expect(prep.issues.some((issue) => issue.code === 'overCapacity')).toBe(true)
    expect(prep.issues.filter((issue) => issue.code === 'unplaced')).toHaveLength(3)
  })

  it('proposes a sharing, refuses a correction that breaks a rule and keeps an unfinished plan', async () => {
    const prep = await create()
    const proposed = (await send('post', `${BASE}/${prep.no}/propose`, {})).data
      .data as LoadingPreparationApi
    expect(proposed.plan.length).toBeGreaterThan(0)
    // One product per compartment: Essence cannot join Gazole.
    const gazole = proposed.plan.find((entry) => entry.requestNo === 'DL-2026-0021')!
    const essence = proposed.plan.find((entry) => entry.requestNo === 'DL-2026-0020')!
    const mixed = [
      ...proposed.plan.map((entry) =>
        entry === essence ? { ...entry, quantity: entry.quantity - 1 } : entry
      ),
      { ...gazole, requestNo: 'DL-2026-0020', requestLineNo: 1, quantity: 1 }
    ]
    const refused = await send('put', `${BASE}/${prep.no}/plan`, { entries: mixed })
    expect(refused.status).toBe(422)
    expect(refused.data.message).toContain('one product')
    // Over the volume of a compartment.
    const over = await send('put', `${BASE}/${prep.no}/plan`, {
      entries: [
        {
          vehicleNo: 'VEH-023',
          compartmentNo: 3,
          requestNo: 'DL-2026-0021',
          requestLineNo: 1,
          quantity: 9000
        }
      ]
    })
    expect(over.status).toBe(422)
    expect(over.data.message).toContain('Capacity exceeded')
    // An unfinished plan is saved; the preparation stays pending.
    const saved = await send('put', `${BASE}/${prep.no}/plan`, {
      entries: [
        {
          vehicleNo: 'VEH-023',
          compartmentNo: 1,
          requestNo: 'DL-2026-0021',
          requestLineNo: 1,
          quantity: 12000
        }
      ]
    })
    const kept = saved.data.data as LoadingPreparationApi
    expect(kept.status).toBe('pending')
    expect(
      kept.issues.some((issue) => issue.code === 'unplaced' && issue.requestNo === 'DL-2026-0004')
    ).toBe(true)
    const reread = (await call(server, 'get', `${BASE}/${prep.no}`, { as: 'PLN001' })).data
      .data as LoadingPreparationApi
    expect(reread.plan).toHaveLength(1)
  })

  it('refuses a vehicle without the equipment a delivery point requires', async () => {
    const prep = await create(['VEH-022', 'VEH-023'])
    // Only CT 4203 (VEH-023) carries a pump; CT 4202 (VEH-022) does not.
    const bare = 'VEH-022'
    // DP-009 (order DL-2026-0004) asks for a pump.
    const result = await send('put', `${BASE}/${prep.no}/plan`, {
      entries: [
        {
          vehicleNo: bare,
          compartmentNo: 1,
          requestNo: 'DL-2026-0004',
          requestLineNo: 1,
          quantity: 1000
        }
      ]
    })
    expect(result.status).toBe(422)
    expect(result.data.message).toContain('Required equipment missing')
  })
})
