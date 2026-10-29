import { beforeEach, describe, expect, it } from 'vitest'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'LIV001') =>
  call(server, 'post', url, { as, body, language: 'en' })

async function readyCarrier() {
  await post('/planning/transport-orders/TR-2026-0004/lines/1/confirm', {}, 'CLI001')
  await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
    as: 'DEP001',
    body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
  })
  await post('/planning/transport-orders/TR-2026-0004/lines/1/conform', {}, 'DEP001')
  await post('/planning/transport-orders/TR-2026-0004/depart')
}

/** The driver of the fleet order declares from his space, once arrived at the point. */
async function driverDeclare(
  orderNo: string,
  lineNo: number,
  body: Record<string, unknown>,
  as = 'CND001'
) {
  await call(server, 'post', `/me/orders/${orderNo}/lines/${lineNo}/arrive`, { as })
  return call(server, 'post', `/me/orders/${orderNo}/lines/${lineNo}/declare`, {
    as,
    body,
    language: 'en'
  })
}

describe('reception', () => {
  it('lets the recipient contest a declared delivery, then the planner handles it', async () => {
    await readyCarrier()
    const early = await post(
      '/planning/transport-orders/TR-2026-0004/lines/1/receive-confirm',
      { signer: 'Aina' },
      'CLI001'
    )
    expect(early.status).toBe(409)
    await post('/planning/transport-orders/TR-2026-0004/lines/1/declare', { receivedQuantity: 60 })
    expect(
      (await post('/planning/transport-orders/TR-2026-0004/lines/1/receive-confirm', {}, 'CLI001'))
        .status
    ).toBe(400)
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0004/lines/1/receive-contest',
          { reasonNo: 'RFS-DAMAGED' },
          'CLI001'
        )
      ).status
    ).toBe(422)
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0004/lines/1/receive-contest',
          { reasonNo: 'CST-QUANTITY' },
          'DEP001'
        )
      ).status
    ).toBe(403)
    const contested = await post(
      '/planning/transport-orders/TR-2026-0004/lines/1/receive-contest',
      { reasonNo: 'CST-QUANTITY' },
      'CLI001'
    )
    expect(contested.status).toBe(200)
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0004/lines/1/receive-confirm',
          { signer: 'Aina' },
          'CLI001'
        )
      ).status
    ).toBe(409)
    expect(
      (await post('/planning/transport-orders/TR-2026-0004/lines/1/handle-contest', {}, 'CLI001'))
        .status
    ).toBe(403)
    const handled = await post(
      '/planning/transport-orders/TR-2026-0004/lines/1/handle-contest',
      {
        note: 'Avoir proposé',
        reasonNo: 'CST-QUANTITY'
      },
      'PLN001'
    )
    expect(handled.data.data).toMatchObject({ handled: true })
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0004/lines/1/handle-contest',
          {
            note: 'Encore'
          },
          'PLN001'
        )
      ).status
    ).toBe(409)
  })

  it('lets the recipient answer the survey himself, after his own confirmation (TRS04-US06)', async () => {
    await driverDeclare('TR-2026-0003', 1, { receivedQuantity: 150 })
    const token = server.db.transportOrders.find('TR-2026-0003')!.lines[0]!.trackingToken!
    const survey = (body: Record<string, unknown>) =>
      call(server, 'post', `/public/tracking/${token}/satisfaction`, { body, language: 'en' })
    expect((await survey({ score: 5 })).status).toBe(409)
    await call(server, 'post', `/public/tracking/${token}/receive-confirm`, {
      body: { signer: 'Rabe' }
    })
    expect((await survey({ score: 6 })).status).toBe(400)
    const rated = (await survey({ score: 4, comment: 'Ponctuel' })).data.data as {
      satisfactionScore: number
    }
    expect(rated.satisfactionScore).toBe(4)
    expect((await survey({ score: 3 })).status).toBe(409)
    // The planner reads it on the order card.
    const card = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0003', { as: 'PLN001' })
    ).data.data as { lines: { satisfactionScore: number | null; satisfactionComment: string }[] }
    expect(card.lines[0]).toMatchObject({ satisfactionScore: 4, satisfactionComment: 'Ponctuel' })
    // Nobody answers it in his place.
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0003/lines/1/satisfaction',
          { score: 2 },
          'CLI001'
        )
      ).status
    ).toBe(404)
  })

  it('receives a refused load at the warehouse', async () => {
    await readyCarrier()
    await post('/planning/transport-orders/TR-2026-0004/lines/1/refuse', {
      reasonNo: 'RFS-DAMAGED'
    })
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0004/lines/1/receive-return',
          { conforming: false },
          'DEP001'
        )
      ).status
    ).toBe(400)
    const received = await post(
      '/planning/transport-orders/TR-2026-0004/lines/1/receive-return',
      { conforming: false, reasonNo: 'NCF-PACKAGING' },
      'DEP001'
    )
    expect(received.status).toBe(200)
    expect((await post('/planning/transport-orders/TR-2026-0004/lines/1/hand-back')).status).toBe(
      409
    )
  })

  it('puts the missing quantity back into the request pool once', async () => {
    await driverDeclare('TR-2026-0003', 1, { receivedQuantity: 100 })
    expect((await post('/planning/transport-orders/TR-2026-0003/lines/1/hand-back')).status).toBe(
      409
    )
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0003/lines/1/remainder',
          {
            date: '2026-09-01'
          },
          'PLN001'
        )
      ).status
    ).toBe(422)
    const remainder = await post(
      '/planning/transport-orders/TR-2026-0003/lines/1/remainder',
      {
        date: '2026-09-12'
      },
      'PLN001'
    )
    // The remainder rides on a child order, taken into the pending transport order of that day
    // with the lines replanned to it (TRS01-US17).
    const { requestNo, orderNo } = remainder.data.data as { requestNo: string; orderNo: string }
    expect(requestNo).toBe('DL-2026-0022')
    const created = (
      await call(server, 'get', '/planning/delivery-requests/DL-2026-0022', { as: 'LIV001' })
    ).data.data as DeliveryRequestApi
    expect(created).toMatchObject({
      status: 'planned',
      quantity: 50,
      parentNo: 'DL-2026-0010',
      desiredDate: '2026-09-12',
      transportOrderNo: orderNo
    })
    expect(created.weightKg).toBeCloseTo(733.333, 2)
    expect(server.db.transportOrders.find(orderNo)).toMatchObject({ replanDate: '2026-09-12' })
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0003/lines/1/remainder',
          {
            date: '2026-09-15'
          },
          'PLN001'
        )
      ).status
    ).toBe(409)
  })
})
