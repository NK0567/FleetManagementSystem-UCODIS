import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const as = (code: string, method: 'get' | 'post' | 'put', url: string, body = {}) =>
  call(server, method, url, { as: code, body, language: 'en' })

describe('driver space', () => {
  it('shows the driver his own order only, with recipient, address and content', async () => {
    const mine = (await as('CND001', 'get', '/me/orders')).data.data as {
      no: string
      lines: { recipientName: string; address: string; productName: string }[]
    }[]
    expect(mine.map((order) => order.no)).toEqual(['TR-2026-0003'])
    expect(mine[0]?.lines[0]).toMatchObject({ productName: expect.any(String) })
    expect(mine[0]?.lines[0]?.address).not.toBe('')
    // Another driver cannot act on it.
    const other = await as('CND014', 'post', '/me/orders/TR-2026-0003/lines/1/arrive')
    expect(other.status).toBe(403)
  })

  it('declares only once arrived, and the planner no longer declares a fleet order', async () => {
    const line = '/me/orders/TR-2026-0003/lines/1'
    expect((await as('CND001', 'post', `${line}/declare`, { receivedQuantity: 150 })).status).toBe(
      409
    )
    expect((await as('CND001', 'post', `${line}/arrive`)).status).toBe(200)
    expect((await as('CND001', 'post', `${line}/declare`, { receivedQuantity: 150 })).status).toBe(
      200
    )
    expect(
      (
        await as('PLN001', 'post', '/planning/transport-orders/TR-2026-0003/lines/1/refuse', {
          reasonNo: 'RFS-DAMAGED'
        })
      ).status
    ).toBe(409)
  })

  it('checks the load compartment by compartment, then starts the order on the first arrival', async () => {
    await as('CLI001', 'post', '/planning/transport-orders/TR-2026-0002/lines/1/confirm')
    const check = { lineNos: [1], verdict: 'conform' }
    // Nothing to check before the warehouse has confirmed the quantities loaded.
    expect((await as('CND014', 'post', '/me/orders/TR-2026-0002/check', check)).status).toBe(409)
    await as('DEP001', 'put', '/planning/transport-orders/TR-2026-0002/loading', {
      lines: [{ lineNo: 1, loadedQuantity: 400 }]
    })
    const checked = await as('CND014', 'post', '/me/orders/TR-2026-0002/check', check)
    expect(checked.data.data).toMatchObject({ ready: true, status: 'ready' })
    const arrived = await as('CND014', 'post', '/me/orders/TR-2026-0002/lines/1/arrive')
    expect(arrived.data.data).toMatchObject({ status: 'in_progress' })
  })
})
