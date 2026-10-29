import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

describe('driver notifications', () => {
  it('tell the driver that his order is cancelled, with its reason (TRS01-US18)', async () => {
    const cancelled = await call(server, 'post', '/planning/transport-orders/TR-2026-0002/cancel', {
      as: 'PLN001',
      body: { reasonNo: 'CXL-CUSTOMER' }
    })
    expect(cancelled.status).toBe(200)
    // CND014 drives TRP-00007, the trip of TR-2026-0002.
    const mine = (await call(server, 'get', '/me/notifications', { as: 'CND014' })).data.data as {
      kind: string
      orderNo: string
      detail: string
      readAt: string | null
    }[]
    expect(mine[0]).toMatchObject({
      kind: 'order_cancelled',
      orderNo: 'TR-2026-0002',
      readAt: null
    })
    expect(mine[0]!.detail).not.toBe('')
    const marked = await call(server, 'post', '/me/notifications/read', { as: 'CND014' })
    expect(marked.data).toMatchObject({ statusCode: 200 })
    const read = (await call(server, 'get', '/me/notifications', { as: 'CND014' })).data.data as {
      readAt: string | null
    }[]
    expect(read[0]!.readAt).not.toBeNull()
    // Nobody else sees it.
    expect((await call(server, 'get', '/me/notifications', { as: 'CND001' })).data.data).toEqual([])
  })
})
