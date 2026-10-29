import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

describe('planning reports', () => {
  it('hides orders outside the user region and counts only what remains', async () => {
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

    const limitedBoard = await call(server, 'get', '/planning/dashboard', { as: 'DIR001' })
    const fullBoard = await call(server, 'get', '/planning/dashboard', { as: 'LIV001' })
    const board = (response: { data: { data: unknown } }) =>
      response.data.data as { orders: number; punctuality: number | null }
    expect(board(limitedBoard).orders).toBeLessThan(board(fullBoard).orders)
    expect(board(fullBoard).punctuality).toBeNull()
  })
})
