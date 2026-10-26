import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', url, { as, body, language: 'en' })

describe('customer billing', () => {
  it('freezes the flat rate of the customer and rejects a reference already used', async () => {
    const line = '/planning/transport-orders/TR-2026-0004/lines/1'
    await post(`${line}/confirm`, {}, 'CLI001')
    await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
      as: 'DEP001',
      body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
    })
    await post(`${line}/conform`, {}, 'DEP001')
    await post('/planning/transport-orders/TR-2026-0004/depart')
    await post(`${line}/declare`, { receivedQuantity: 60 })
    expect((await post(`${line}/invoice`, { reference: 'FAC-2026-0001' })).status).toBe(422)
    await post(`${line}/receive-confirm`, { signer: 'Aina' }, 'CLI001')
    const invoiced = await post(`${line}/invoice`, { reference: 'FAC-2026-0001' })
    expect(invoiced.data.data).toMatchObject({
      reference: 'FAC-2026-0001',
      amount: 1_800_000,
      customerNo: 'CLI-002'
    })
    expect((await post(`${line}/invoice`, { reference: 'FAC-2026-0002' })).status).toBe(409)
    expect(
      (
        await post(`${line}/responsibility`, {
          origin: 'transport',
          comment: 'Trop tard',
          shares: [{ actor: 'external_carrier', percent: 100 }],
          impacts: [{ type: 'customer_credit', amount: 100 }]
        })
      ).status
    ).toBe(409)
    expect(
      (
        await post('/planning/transport-orders/TR-2026-0003/lines/1/declare', {
          receivedQuantity: 100
        })
      ).status
    ).toBe(200)
    await post(
      '/planning/transport-orders/TR-2026-0003/lines/1/receive-confirm',
      { signer: 'Rabe' },
      'CLI001'
    )
    expect(
      (
        await post('/planning/transport-orders/TR-2026-0003/lines/1/invoice', {
          reference: 'fac-2026-0001'
        })
      ).status
    ).toBe(409)
  })

  it('refuses to invoice an unqualified gap', async () => {
    await post('/planning/transport-orders/TR-2026-0003/lines/1/declare', { receivedQuantity: 100 })
    await post(
      '/planning/transport-orders/TR-2026-0003/lines/1/receive-confirm',
      { signer: 'Rabe' },
      'CLI001'
    )
    expect(
      (
        await post('/planning/transport-orders/TR-2026-0003/lines/1/invoice', {
          reference: 'FAC-9'
        })
      ).status
    ).toBe(422)
  })
})
