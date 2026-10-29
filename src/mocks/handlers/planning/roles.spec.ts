import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, as: string, body: Record<string, unknown> = {}) =>
  call(server, 'post', url, { as, body, language: 'en' })
const order = '/planning/transport-orders/TR-2026-0003'

/* Each actor of the user stories keeps his own gestures: the rights refuse the others. */
describe('transport roles', () => {
  it('leaves planning, remainders and contests to the planner', async () => {
    expect((await post('/planning/transport-orders/TR-2026-0001/plan', 'LIV001')).status).toBe(403)
    expect(
      (await post(`${order}/lines/1/remainder`, 'LIV001', { date: '2026-12-01' })).status
    ).toBe(403)
    expect((await post(`${order}/lines/1/handle-contest`, 'LIV001', { note: 'x' })).status).toBe(
      403
    )
  })

  it('leaves gaps, documents and debriefing to the delivery manager', async () => {
    expect((await post(`${order}/lines/1/qualify`, 'PLN001', { kind: 'loss' })).status).toBe(403)
    expect((await post(`${order}/debriefing`, 'PLN001', { voucherNo: 'BL-1' })).status).toBe(403)
    expect((await post(`${order}/documents`, 'PLN001', {})).status).toBe(403)
  })

  it('leaves the reception of returns to the warehouse', async () => {
    expect((await post(`${order}/lines/1/receive-return`, 'LIV001')).status).toBe(403)
    expect((await post(`${order}/lines/1/receive-return`, 'PLN001')).status).toBe(403)
    // The warehouse is allowed; here nothing has come back yet.
    expect((await post(`${order}/lines/1/receive-return`, 'DEP001')).status).not.toBe(403)
  })

  it('leaves the settings of the delivery sites, compatibilities and tolerances to the administrator', async () => {
    const point = { name: 'Quai 9', customerNo: 'CLI-004', latitude: -18.9, longitude: 47.5 }
    expect((await post('/planning/delivery-points', 'LIV001', point)).status).toBe(403)
    expect(
      (await post('/planning/quantity-tolerances', 'LIV001', { customerNo: 'CLI-002', value: 2 }))
        .status
    ).toBe(403)
    expect(
      (
        await post('/planning/product-compatibilities', 'LIV001', {
          kind: 'together',
          productANo: 'PRD-007',
          productBNo: 'PRD-008'
        })
      ).status
    ).toBe(403)
    // He keeps the recipients and the products (TRS06-US03, US04).
    expect((await call(server, 'get', '/planning/customers', { as: 'LIV001' })).status).toBe(200)
  })
})
