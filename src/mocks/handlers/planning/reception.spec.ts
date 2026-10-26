import { beforeEach, describe, expect, it } from 'vitest'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import type { ReceptionLineApi } from './reception'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
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
      (await post('/planning/transport-orders/TR-2026-0004/lines/1/receive-confirm', {}, 'CLI001')).status
    ).toBe(400)
    expect(
      (await post('/planning/transport-orders/TR-2026-0004/lines/1/receive-contest', { reasonNo: 'RFS-DAMAGED' }, 'CLI001'))
        .status
    ).toBe(422)
    expect((await post('/planning/transport-orders/TR-2026-0004/lines/1/receive-contest', { reasonNo: 'CST-QUANTITY' }, 'DEP001')).status).toBe(
      403
    )
    const contested = await post(
      '/planning/transport-orders/TR-2026-0004/lines/1/receive-contest',
      { reasonNo: 'CST-QUANTITY' },
      'CLI001'
    )
    expect(contested.status).toBe(200)
    expect(
      (await post('/planning/transport-orders/TR-2026-0004/lines/1/receive-confirm', { signer: 'Aina' }, 'CLI001')).status
    ).toBe(409)
    expect((await post('/planning/transport-orders/TR-2026-0004/lines/1/handle-contest', {}, 'CLI001')).status).toBe(403)
    const handled = await post('/planning/transport-orders/TR-2026-0004/lines/1/handle-contest', {
      note: 'Avoir proposé',
      reasonNo: 'CST-QUANTITY'
    })
    expect(handled.data.data).toMatchObject({ handled: true })
    expect(
      (await post('/planning/transport-orders/TR-2026-0004/lines/1/handle-contest', { note: 'Encore' })).status
    ).toBe(409)
  })

  it('records satisfaction once the recipient has confirmed', async () => {
    await post('/planning/transport-orders/TR-2026-0003/lines/1/declare', { receivedQuantity: 150 })
    expect((await post('/planning/transport-orders/TR-2026-0003/lines/1/satisfaction', { score: 5 }, 'CLI001')).status).toBe(
      409
    )
    await post('/planning/transport-orders/TR-2026-0003/lines/1/receive-confirm', { signer: 'Rabe' }, 'CLI001')
    expect((await post('/planning/transport-orders/TR-2026-0003/lines/1/satisfaction', { score: 6 }, 'CLI001')).status).toBe(
      400
    )
    const rated = await post('/planning/transport-orders/TR-2026-0003/lines/1/satisfaction', { score: 4 }, 'CLI001')
    expect(rated.data.data).toMatchObject({ score: 4 })
    expect((await post('/planning/transport-orders/TR-2026-0003/lines/1/satisfaction', { score: 3 }, 'CLI001')).status).toBe(
      409
    )
    const listed = await call(server, 'get', '/planning/receptions', { as: 'CLI001' })
    const line = (listed.data.data as ReceptionLineApi[]).find((item) => item.orderNo === 'TR-2026-0003')
    expect(line).toBeUndefined()
  })

  it('receives a refused load at the warehouse', async () => {
    await readyCarrier()
    await post('/planning/transport-orders/TR-2026-0004/lines/1/refuse', { reasonNo: 'RFS-DAMAGED' })
    expect(
      (await post('/planning/transport-orders/TR-2026-0004/lines/1/receive-return', { conforming: false }, 'DEP001'))
        .status
    ).toBe(400)
    const received = await post(
      '/planning/transport-orders/TR-2026-0004/lines/1/receive-return',
      { conforming: false, reasonNo: 'NCF-PACKAGING' },
      'DEP001'
    )
    expect(received.status).toBe(200)
    expect((await post('/planning/transport-orders/TR-2026-0004/lines/1/hand-back')).status).toBe(409)
  })

  it('puts the missing quantity back into the request pool once', async () => {
    await post('/planning/transport-orders/TR-2026-0003/lines/1/declare', { receivedQuantity: 100 })
    expect((await post('/planning/transport-orders/TR-2026-0003/lines/1/hand-back')).status).toBe(409)
    expect(
      (await post('/planning/transport-orders/TR-2026-0003/lines/1/remainder', { date: '2026-09-01' })).status
    ).toBe(422)
    const remainder = await post('/planning/transport-orders/TR-2026-0003/lines/1/remainder', {
      date: '2026-09-12'
    })
    expect(remainder.data.data).toMatchObject({ requestNo: 'DL-2026-0012' })
    const created = (await call(server, 'get', '/planning/delivery-requests/DL-2026-0012', { as: 'FLT001' }))
      .data.data as DeliveryRequestApi
    expect(created).toMatchObject({
      status: 'pending',
      quantity: 50,
      weightKg: 733,
      parentNo: 'DL-2026-0010',
      desiredDate: '2026-09-12',
      transportOrderNo: null
    })
    expect(
      (await post('/planning/transport-orders/TR-2026-0003/lines/1/remainder', { date: '2026-09-15' })).status
    ).toBe(409)
  })
})
