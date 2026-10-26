import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

describe('planning reports', () => {
  it('hides orders outside the user region and counts only what remains', async () => {
    const all = await call(server, 'get', '/planning/transport-orders', { as: 'FLT001', query: { pageSize: 100 } })
    const limited = await call(server, 'get', '/planning/transport-orders', { as: 'DIR001', query: { pageSize: 100 } })
    const numbers = (response: { data: { data: { items: { no: string }[] } } }) =>
      response.data.data.items.map((item) => item.no)
    expect(numbers(all)).toContain('TR-2026-0004')
    expect(numbers(limited)).not.toContain('TR-2026-0004')
    expect(numbers(limited)).toContain('TR-2026-0002')

    const board = await call(server, 'get', '/planning/dashboard', { as: 'DIR001' })
    const full = await call(server, 'get', '/planning/dashboard', { as: 'FLT001' })
    expect(board.data.data.orders).toBeLessThan(full.data.data.orders)
    expect(full.data.data.punctuality).toBeNull()
  })
})
