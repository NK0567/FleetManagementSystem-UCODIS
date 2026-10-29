import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PlanningDashboardApi,
  TransportReportApi
} from '@/modules/planning/reports/types/planningReport.types'
import { ROLE_PERMISSIONS } from '../../fixtures/auth/rolePermissions'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'PLN001') =>
  call(server, 'post', url, { as, body, language: 'en' })

async function board(query: Record<string, unknown> = {}, as = 'LIV001') {
  return (await call(server, 'get', '/planning/dashboard', { as, query })).data
    .data as PlanningDashboardApi
}

async function report(query: Record<string, unknown> = {}, as = 'LIV001') {
  return (await call(server, 'get', '/planning/reports/transport', { as, query })).data
    .data as TransportReportApi
}

/** The carrier order leaves and is delivered short: 50 received out of 60 loaded. */
async function deliverCarrierOrder() {
  await post('/planning/transport-orders/TR-2026-0004/lines/1/confirm', {}, 'CLI001')
  await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
    as: 'DEP001',
    body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
  })
  await post('/planning/transport-orders/TR-2026-0004/lines/1/conform', {}, 'DEP001')
  await post('/planning/transport-orders/TR-2026-0004/depart')
  await post('/planning/transport-orders/TR-2026-0004/lines/1/declare', { receivedQuantity: 50 })
}

describe('planning reports', () => {
  it('hides orders outside the user region and counts only what remains', async () => {
    // Back before the driver's arrival on the point, which the demo already marks.
    const seeded = server.db.transportOrders.find('TR-2026-0003')!
    server.db.transportOrders.update(seeded.no, {
      lines: seeded.lines.map((item) => ({ ...item, arrivedAt: null }))
    })
    const all = await call(server, 'get', '/planning/transport-orders', {
      as: 'LIV001',
      query: { pageSize: 100 }
    })
    const limited = await call(server, 'get', '/planning/transport-orders', {
      as: 'DIR001',
      query: { pageSize: 100 }
    })
    const numbers = (response: { data: { data: unknown } }) =>
      (response.data.data as { items: { no: string }[] }).items.map((item) => item.no)
    expect(numbers(all)).toContain('TR-2026-0004')
    expect(numbers(limited)).not.toContain('TR-2026-0004')
    expect(numbers(limited)).toContain('TR-2026-0002')

    const limitedBoard = await board({}, 'DIR001')
    const fullBoard = await board()
    expect(limitedBoard.orders).toBeLessThan(fullBoard.orders)
    expect(fullBoard.punctuality).toBeNull()
  })

  it('shows the orders by status, the late and alerted ones and the commandes still waiting', async () => {
    const full = await board()
    const counted = Object.values(full.byStatus).reduce((sum, count) => sum + (count ?? 0), 0)
    expect(counted).toBe(full.orders)
    expect(full.byStatus.cancelled).toBe(1)
    const waiting = full.pendingRequests.map((request) => request.no)
    expect(waiting).toContain('DL-2026-0001')
    // A commande already in a transport order is not waiting.
    expect(waiting).not.toContain('DL-2026-0009')
    // The trip of TR-2026-0003 has a deviation still to qualify.
    expect(full.alerts).toContainEqual(
      expect.objectContaining({ orderNo: 'TR-2026-0003', kind: 'deviation' })
    )
    expect(full.late).toEqual([])

    // The next morning, the planned order has not left and the one on the road is overdue.
    vi.setSystemTime(new Date('2026-09-05T08:00:00'))
    const later = await board()
    expect(later.late).toContainEqual(
      expect.objectContaining({ orderNo: 'TR-2026-0002', kind: 'departure' })
    )
    expect(later.late).toContainEqual(
      expect.objectContaining({ orderNo: 'TR-2026-0003', kind: 'arrival' })
    )
  })

  it('filters by period, depot, region and orderer', async () => {
    const boeny = await board({ region: 'Boeny' })
    expect(boeny.orders).toBe(1)
    expect(boeny.byStatus.planned).toBe(1)
    expect((await board({ depotNo: 'DEP-ALR' })).orders).toBe(0)
    expect((await board({ depotNo: 'DEP-TNJ' })).orders).toBe(5)
    const orderer = await board({ ordererNo: 'CLI-010' })
    expect(orderer.pendingRequests.length).toBeGreaterThan(0)
    expect(orderer.orders).toBeLessThan(5)
    const day = await board({ from: '2026-09-04', to: '2026-09-04' })
    expect(day.orders).toBe(2)
    const future = await board({ from: '2027-01-01' })
    expect(future.orders).toBe(0)
    expect(future.pendingRequests).toEqual([])
  })

  it('compares arrivals, totals the costs and reads quality and carrier gaps', async () => {
    // Back before the driver's arrival on the point, which the demo already marks.
    const seeded = server.db.transportOrders.find('TR-2026-0003')!
    server.db.transportOrders.update(seeded.no, {
      lines: seeded.lines.map((item) => ({ ...item, arrivedAt: null }))
    })
    const empty = await report()
    expect(empty.punctuality.total).toBe(0)
    expect(empty.punctuality.rate).toBeNull()
    expect(empty.quality.concerned).toBe(0)
    server.db.transportOrders.update(seeded.no, { lines: seeded.lines })

    await deliverCarrierOrder()
    const invoice = await post(
      '/planning/carrier-invoices',
      {
        carrierNo: 'PRS-016',
        reference: 'F-1',
        date: '2026-09-01',
        amount: 100000,
        orderNos: ['TR-2026-0004']
      },
      'FAC001'
    )
    expect(invoice.status).toBe(201)
    const agreed = (invoice.data.data as { agreedAmount: number }).agreedAmount

    const data = await report()
    const delivery = data.punctuality.deliveries.find((row) => row.orderNo === 'TR-2026-0004')
    expect(delivery).toMatchObject({ carrierKey: 'PRS-016', onTime: true })
    expect(data.punctuality.byRecipient).toHaveLength(2)
    expect(data.punctuality.byCarrier.find((row) => row.key === 'PRS-016')).toMatchObject({
      rate: 100
    })

    const carrierCost = data.costs.orders.find((row) => row.orderNo === 'TR-2026-0004')
    expect(carrierCost).toMatchObject({ carrierInvoice: 100000, total: 100000, fuelCost: null })
    const fleetCost = data.costs.orders.find((row) => row.orderNo === 'TR-2026-0003')
    expect(fleetCost?.distanceKm).toBe(352)
    expect(fleetCost?.carrierInvoice).toBeNull()
    expect(data.costs.totals.total).toBe(
      data.costs.orders.reduce((sum, row) => sum + (row.total ?? 0), 0)
    )

    expect(data.quality).toMatchObject({ concerned: 1, partial: 1, refused: 0 })
    expect(data.quality.rates.partial).toBe(100)

    const means = data.means.orders.find((row) => row.orderNo === 'TR-2026-0003')
    expect(means?.weightRate).toBe(Math.round((2200 / (means?.capacityKg ?? 1)) * 100))
    expect(means?.deliveries).toBe(1)

    expect(data.carriers[0]).toMatchObject({
      carrierNo: 'PRS-016',
      orders: 1,
      partials: 1,
      invoices: 1,
      invoiceGap: 100000 - agreed
    })
  })

  it('reads the fuel gaps at 15 °C as gain or loss', async () => {
    const fuelNo = server.db.products.all().find((product) => product.isFuel)?.no
    expect(fuelNo).toBeTruthy()
    const order = server.db.transportOrders.findOrFail('TR-2026-0003')
    server.db.transportOrders.update(order.no, {
      lines: order.lines.map((line) => ({
        ...line,
        productNo: fuelNo!,
        declaredAt: '2026-09-04T09:00:00',
        receivedQuantity: 146,
        quantityGap: -4,
        gapQualification: 'loss' as const
      }))
    })
    const gaps = (await report()).quality.fuelGaps
    expect(gaps).toMatchObject({ lossCount: 1, lossVolume: 4, gainCount: 0, unqualified: 0 })
    expect(gaps.rows[0]).toMatchObject({ orderNo: 'TR-2026-0003', qualification: 'loss' })
  })

  it('leaves the export of the reports to the director', async () => {
    const actions = (profile: keyof typeof ROLE_PERMISSIONS, feature: string) =>
      ROLE_PERMISSIONS[profile][feature]?.actions ?? []
    expect(actions('MANAGEMENT', 'TRANSPORTREPORT')).toContain('export')
    expect(actions('MANAGEMENT', 'PLANNINGDASHBOARD')).toContain('export')
    expect(actions('DELIVERY_MANAGER', 'TRANSPORTREPORT')).not.toContain('export')
    expect(actions('DELIVERY_MANAGER', 'PLANNINGDASHBOARD')).not.toContain('export')
    expect(actions('BILLING', 'TRANSPORTREPORT')).not.toContain('export')
    const as = (code: string, url: string) => call(server, 'get', url, { as: code })
    expect((await as('DIR001', '/planning/reports/transport')).status).toBe(200)
    expect((await as('PLN001', '/planning/reports/transport')).status).toBe(403)
    expect((await as('DEP001', '/planning/dashboard')).status).toBe(403)
  })
})
