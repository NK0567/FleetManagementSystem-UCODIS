import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', url, { as, body, language: 'en' })

describe('delivery quality', () => {
  it('numbers protest notes by year and closes only an issued note', async () => {
    const line = '/planning/transport-orders/TR-2026-0003/lines/1'
    expect((await post(`${line}/protests`, { reasonNo: 'PRT-DAMAGE', quantity: 1 })).status).toBe(
      409
    )
    await post(`${line}/declare`, { receivedQuantity: 100 })
    expect((await post(`${line}/protests`, { reasonNo: 'PRT-DAMAGE', quantity: 200 })).status).toBe(
      422
    )
    expect((await post(`${line}/protests`, { reasonNo: 'RFS-DAMAGED', quantity: 10 })).status).toBe(
      422
    )
    const first = await post(`${line}/protests`, { reasonNo: 'PRT-DAMAGE', quantity: 10 })
    expect(first.data.data).toMatchObject({ no: 'NP-2026-0001' })
    const second = await post(`${line}/protests`, { reasonNo: 'PRT-SHORT', quantity: 5 })
    expect(second.data.data).toMatchObject({ no: 'NP-2026-0002' })
    expect((await post(`${line}/protests/NP-2026-0001/close`, { outcome: 'Réglé' })).status).toBe(
      409
    )
    expect((await post(`${line}/protests/NP-2026-0001/issue`, {}, 'DIR001')).status).toBe(403)
    expect((await post(`${line}/protests/NP-2026-0001/issue`)).status).toBe(200)
    expect(
      (
        await call(server, 'patch', `${line}/protests/NP-2026-0001`, {
          as: 'FLT001',
          body: { reasonNo: 'PRT-DAMAGE', quantity: 2 }
        })
      ).status
    ).toBe(409)
    expect((await post(`${line}/protests/NP-2026-0001/close`, {})).status).toBe(400)
    expect(
      (await post(`${line}/protests/NP-2026-0001/close`, { outcome: 'Avoir accepté' })).status
    ).toBe(200)
  })

  it('sets the withholding to the credit times the carrier share and freezes it', async () => {
    await post('/planning/transport-orders/TR-2026-0004/lines/1/confirm', {}, 'CLI001')
    await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
      as: 'DEP001',
      body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
    })
    await post('/planning/transport-orders/TR-2026-0004/lines/1/conform', {}, 'DEP001')
    await post('/planning/transport-orders/TR-2026-0004/depart')
    await post('/planning/transport-orders/TR-2026-0004/lines/1/declare', { receivedQuantity: 50 })
    const line = '/planning/transport-orders/TR-2026-0004/lines/1'
    const shares = [
      { actor: 'external_carrier', percent: 40 },
      { actor: 'orderer', percent: 60 }
    ]
    expect(
      (
        await post(`${line}/responsibility`, {
          origin: 'transport',
          comment: 'Manque',
          shares: [{ actor: 'orderer', percent: 100 }],
          impacts: [{ type: 'carrier_withholding', amount: 50 }]
        })
      ).status
    ).toBe(422)
    const set = await post(`${line}/responsibility`, {
      origin: 'transport',
      comment: 'Manque',
      shares,
      impacts: [
        { type: 'customer_credit', amount: 1000 },
        { type: 'carrier_withholding', amount: 1 }
      ]
    })
    expect((set.data.data as { impacts: unknown }).impacts).toEqual([
      { type: 'customer_credit', amount: 1000 },
      { type: 'carrier_withholding', amount: 400 }
    ])
    const issued = await post(`${line}/issue-credit`, { reference: 'AV-2026-0001' })
    expect(issued.data.data).toMatchObject({ reference: 'AV-2026-0001' })
    expect((await post(`${line}/issue-credit`, { reference: 'av-2026-0001' })).status).toBe(409)
    server.db.transportOrders.update('TR-2026-0004', {
      ...server.db.transportOrders.findOrFail('TR-2026-0004'),
      lines: server.db.transportOrders
        .findOrFail('TR-2026-0004')
        .lines.map((item) =>
          item.lineNo === 1 ? { ...item, carrierInvoiceValidatedAt: '2026-09-04T18:00:00' } : item
        )
    })
    expect(
      (
        await post(`${line}/responsibility`, {
          origin: 'transport',
          comment: 'Encore',
          shares,
          impacts: [{ type: 'customer_credit', amount: 1000 }]
        })
      ).status
    ).toBe(409)
  })
})
