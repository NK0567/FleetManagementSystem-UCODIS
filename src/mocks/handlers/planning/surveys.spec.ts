import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

describe('recipient messages and orderer survey', () => {
  it('message the recipient when the order is planned, then starts (TRS02-US02)', async () => {
    const before = server.db.transportOrders.find('TR-2026-0001')!
    expect(before.lines.every((line) => !(line.recipientMessages ?? []).length)).toBe(true)
    // TR-2026-0003 is on the road: the driver's arrival declares; its recipient gets "declared".
    await call(server, 'post', '/me/orders/TR-2026-0003/lines/1/arrive', { as: 'CND001' })
    await call(server, 'post', '/me/orders/TR-2026-0003/lines/1/declare', {
      as: 'CND001',
      body: { receivedQuantity: 150 }
    })
    const line = server.db.transportOrders.find('TR-2026-0003')!.lines[0]!
    expect((line.recipientMessages ?? []).map((m) => m.kind)).toContain('declared')
  })

  it('opens the orderer survey once the transport order is completed (TRS04-US07)', async () => {
    const path = '/planning/delivery-requests/DL-2026-0009'
    const body = { orderScore: 5, delayScore: 4, qualityScore: 5, comment: 'Bien' }
    expect(
      (await call(server, 'post', `${path}/satisfaction`, { as: 'PLN001', body })).status
    ).toBe(409)
    server.db.transportOrders.update('TR-2026-0002', { closedAt: '2026-10-28T18:00:00' })
    expect(
      (
        await call(server, 'post', `${path}/satisfaction`, {
          as: 'PLN001',
          body: { ...body, delayScore: 9 }
        })
      ).status
    ).toBe(400)
    const answered = await call(server, 'post', `${path}/satisfaction`, { as: 'PLN001', body })
    expect(answered.status).toBe(200)
    const order = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0002', { as: 'PLN001' })
    ).data.data as { ordererSurveys: { requestNo: string; delayScore: number }[] }
    expect(order.ordererSurveys).toEqual([
      expect.objectContaining({ requestNo: 'DL-2026-0009', delayScore: 4 })
    ])
    expect(
      (await call(server, 'post', `${path}/satisfaction`, { as: 'PLN001', body })).status
    ).toBe(409)
  })

  it('proposes the delivery order by proximity (TRS01-US05)', async () => {
    const sequence = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0001/proposed-sequence', {
        as: 'PLN001'
      })
    ).data.data as number[]
    expect([...sequence].sort()).toEqual([1, 2])
  })
})
