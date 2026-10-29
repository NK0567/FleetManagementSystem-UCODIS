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

/* The tankers are trailers: each comes behind a free tractor. */
const TRACTOR: Record<string, string> = {
  'VEH-022': 'VEH-004',
  'VEH-023': 'VEH-006',
  'VEH-024': 'VEH-009',
  'VEH-020': 'VEH-010'
}
const header = (vehicles: string[]) => ({
  depotSiteNo: 'DEP-ALR',
  loadingDate: '2026-09-06',
  validUntil: '2026-09-07',
  region: 'Analamanga',
  requestNos: ['DL-2026-0004', 'DL-2026-0020', 'DL-2026-0021'],
  vehicles: vehicles.map((trailerNo) => ({
    vehicleNo: TRACTOR[trailerNo]!,
    trailerNo,
    driverNo: null
  }))
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
          vehicleNo: 'VEH-006',
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
          vehicleNo: 'VEH-006',
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
    const bare = 'VEH-004'
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

  it('validates the plan: one planned order per vehicle, its driver notified, the plan frozen', async () => {
    // CT 4202 waits for a re-inspection and cannot leave: RM 4110 takes its place.
    const prep = await create(['VEH-020', 'VEH-023'])
    await send('post', `${BASE}/${prep.no}/propose`, {})
    // A vehicle with orders needs its driver and its route type.
    expect((await send('post', `${BASE}/${prep.no}/validate`, {})).status).toBe(422)
    const options = (
      await call(server, 'get', `${BASE}/options`, { as: 'LIV001', query: { except: prep.no } })
    ).data.data as { drivers: { no: string }[]; routes: { no: string }[] }
    const [first, second] = options.drivers.slice(-2)
    const patched = await send('patch', `${BASE}/${prep.no}`, {
      ...header([]),
      vehicles: [
        {
          vehicleNo: 'VEH-010',
          trailerNo: 'VEH-020',
          driverNo: first!.no,
          routeTemplateNo: 'TNR-ATS',
          departureTime: '07:00'
        },
        {
          vehicleNo: 'VEH-006',
          trailerNo: 'VEH-023',
          driverNo: second!.no,
          routeTemplateNo: 'TNR-ATS',
          departureTime: '07:30'
        }
      ]
    })
    expect(patched.status).toBe(200)
    const validated = await send('post', `${BASE}/${prep.no}/validate`, {})
    if (validated.status !== 200) throw new Error(JSON.stringify(validated.data))
    expect(validated.status).toBe(200)
    const done = validated.data.data as LoadingPreparationApi
    expect(done.status).toBe('validated')
    const orderNos = done.vehicles.map((vehicle) => vehicle.orderNo).filter(Boolean) as string[]
    const loaded = new Set(done.plan.map((entry) => entry.vehicleNo))
    expect(orderNos.length).toBeGreaterThan(0)
    expect(orderNos).toHaveLength(loaded.size)
    for (const no of orderNos) {
      const order = (
        await call(server, 'get', `/planning/transport-orders/${no}`, { as: 'PLN001' })
      ).data.data as { status: string; means: string; driverNo: string }
      expect(order.status).toBe('planned')
      expect(order.means).toBe('fleet')
      // Its pickup note and its delivery notes, planned.
      expect(
        (
          await call(server, 'get', `/planning/transport-orders/${no}/pickup-note`, {
            as: 'LIV001'
          })
        ).status
      ).toBe(200)
      const notes = (
        await call(server, 'get', `/planning/transport-orders/${no}/delivery-notes`, {
          as: 'PLN001'
        })
      ).data.data as { state: string }[]
      expect(notes.length).toBeGreaterThan(0)
      expect(notes.every((note) => note.state === 'planned')).toBe(true)
    }
    const placed = new Set(done.plan.map((entry) => entry.requestNo))
    for (const no of placed) {
      expect(server.db.deliveryRequests.find(no)!.transportOrderNo).not.toBeNull()
    }
    // What was left out stays pending.
    for (const no of done.requestNos.filter((item) => !placed.has(item))) {
      expect(server.db.deliveryRequests.find(no)!.transportOrderNo).toBeNull()
    }
    // Each driver is told that the order is entrusted to him.
    expect(
      server.db.notifications.all().filter((row) => row.kind === 'order_assigned')
    ).toHaveLength(orderNos.length)
    // Frozen: the plan no longer changes.
    expect((await send('put', `${BASE}/${prep.no}/plan`, { entries: [] })).status).toBe(409)
  })
})
