import { beforeEach, describe, expect, it } from 'vitest'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'DEP001') =>
  call(server, 'post', url, { as, body, language: 'en' })

describe('loading control', () => {
  it('declares the load and passes the order to ready when every line conforms', async () => {
    await call(server, 'post', '/planning/transport-orders/TR-2026-0002/lines/1/confirm', {
      as: 'CLI001'
    })
    expect(
      (await post('/planning/transport-orders/TR-2026-0002/lines/1/conform', {}, 'COM001')).status
    ).toBe(403)
    expect(
      (
        await call(server, 'put', '/planning/transport-orders/TR-2026-0001/loading', {
          as: 'DEP001',
          body: { lines: [] }
        })
      ).status
    ).toBe(409)
    const declared = await call(server, 'put', '/planning/transport-orders/TR-2026-0002/loading', {
      as: 'DEP001',
      body: { lines: [{ lineNo: 1, loadedQuantity: 400 }] }
    })
    expect(declared.status).toBe(200)
    const checked = await post('/planning/transport-orders/TR-2026-0002/lines/1/conform')
    expect(checked.data.data).toMatchObject({ ready: true, status: 'ready' })
    const order = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0002', { as: 'FLT001' })
    ).data.data as TransportOrderApi
    expect(order.status).toBe('ready')
  })

  it('takes a non-conforming line out of the tour', async () => {
    await call(server, 'post', '/planning/transport-orders/TR-2026-0004/lines/1/confirm', {
      as: 'CLI001'
    })
    await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
      as: 'DEP001',
      body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
    })
    const failed = await post('/planning/transport-orders/TR-2026-0004/lines/1/nonconform', {
      reasonNo: 'NCF-QUANTITY'
    })
    expect(failed.data.data).toMatchObject({ ready: false, status: 'confirmed' })
    expect((await post('/planning/transport-orders/TR-2026-0004/lines/1/conform')).status).toBe(409)
  })
})
