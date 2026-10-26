import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', url, { as, body, language: 'en' })

const invoice = (amount: number, reference = 'F-2026-1') =>
  post('/planning/carrier-invoices', {
    carrierNo: 'PRS-016',
    reference,
    date: '2026-09-04',
    amount,
    orderNos: ['TR-2026-0004']
  })

async function deliver() {
  await post('/planning/transport-orders/TR-2026-0004/lines/1/confirm', {}, 'CLI001')
  await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
    as: 'DEP001',
    body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
  })
  await post('/planning/transport-orders/TR-2026-0004/lines/1/conform', {}, 'DEP001')
  await post('/planning/transport-orders/TR-2026-0004/depart')
  await post('/planning/transport-orders/TR-2026-0004/lines/1/declare', { receivedQuantity: 60 })
}

describe('carrier invoices', () => {
  it('freezes the agreed amount when the invoice matches, and keeps a corrected amount', async () => {
    expect((await invoice(100)).status).toBe(201)
    const early = server.db.carrierInvoices.all()[0]
    expect((await post(`/planning/carrier-invoices/${early.no}/validate`)).status).toBe(422)
    await post(`/planning/carrier-invoices/${early.no}/refuse`, { reason: 'Pas encore livré' })
    await deliver()
    const created = await invoice(700_000, 'F-2026-2')
    const no = (created.data.data as { no: string }).no
    expect((await post(`/planning/carrier-invoices/${no}/validate`)).status).toBe(422)
    await call(server, 'patch', `/planning/carrier-invoices/${no}`, { as: 'FLT001', body: { amount: 604_800 } })
    const validated = await post(`/planning/carrier-invoices/${no}/validate`)
    expect(validated.data.data).toMatchObject({ status: 'validated', agreedAmount: 604_800 })
    expect(server.db.transportOrders.findOrFail('TR-2026-0004').lines[0].carrierInvoiceValidatedAt).toBeTruthy()
    expect((await post(`/planning/carrier-invoices/${no}/validate`)).status).toBe(409)
    expect((await invoice(604_800, 'F-2026-3')).status).toBe(409)
  })

  it('validates without a tariff only when a reason is given', async () => {
    await deliver()
    server.db.transportTariffs.update('TRF-004', { active: false })
    const created = await invoice(500_000, 'F-2026-9')
    const no = (created.data.data as { no: string }).no
    expect((await post(`/planning/carrier-invoices/${no}/validate`)).status).toBe(422)
    const validated = await post(`/planning/carrier-invoices/${no}/validate`, { reason: 'Grille absente' })
    expect(validated.data.data).toMatchObject({ status: 'validated', agreedAmount: null })
  })
})
