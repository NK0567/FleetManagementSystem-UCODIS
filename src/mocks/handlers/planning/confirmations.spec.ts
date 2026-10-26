import { beforeEach, describe, expect, it } from 'vitest'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import type { ConfirmationLineApi } from './confirmations'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const send = (method: 'post' | 'get', url: string, body: Record<string, unknown> = {}, as = 'CLI001') =>
  call(server, method, url, { as, body, language: 'en' })

describe('recipient confirmation', () => {
  it('lists the lines of planned orders and confirms them for the call agent', async () => {
    const listed = await send('get', '/planning/confirmations')
    const lines = listed.data.data as ConfirmationLineApi[]
    expect(lines.some((line) => line.orderNo === 'TR-2026-0002' && line.state === 'pending')).toBe(true)
    expect(lines.some((line) => line.orderNo === 'TR-2026-0001')).toBe(false)
    expect((await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/confirm', {}, 'COM001')).status).toBe(403)
    const confirmed = await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/confirm')
    expect(confirmed.data.data).toMatchObject({ state: 'confirmed' })
    const order = (await call(server, 'get', '/planning/transport-orders/TR-2026-0002', { as: 'FLT001' })).data.data as TransportOrderApi
    expect(order.status).toBe('confirmed')
    expect((await send('post', '/planning/transport-orders/TR-2026-0003/lines/1/confirm')).status).toBe(409)
  })

  it('sends an accepted date back to the requests, without a new order', async () => {
    const proposed = await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/client-date', {
      date: '2026-09-12'
    })
    expect(proposed.data.data).toMatchObject({ clientProposedOn: '2026-09-12' })
    const before = server.db.transportOrders.all().length
    const accepted = await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/accept-date', {
      date: '2026-09-12'
    })
    expect(accepted.data.data).toMatchObject({ state: 'replanned' })
    expect(server.db.transportOrders.all()).toHaveLength(before)
    const created = server.db.deliveryRequests.all().find((row) => row.desiredDate === '2026-09-12' && row.parentNo === 'DL-2026-0009')
    expect(created?.transportOrderNo).toBeNull()
    const request = (await call(server, 'get', `/planning/delivery-requests/${created?.no}`, { as: 'FLT001' })).data.data as DeliveryRequestApi
    expect(request.status).toBe('pending')
    expect((await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/confirm')).status).toBe(409)
  })

  it('refuses an unavailability without a reason from that list, and stamps a tracking token when planning', async () => {
    expect((await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/unavailable', { reasonNo: 'CXL-CUSTOMER' })).status).toBe(422)
    const unavailable = await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/unavailable', {
      reasonNo: 'UNV-CLOSED',
      availableOn: '2026-09-15'
    })
    expect(unavailable.data.data).toMatchObject({ state: 'unavailable', availableOn: '2026-09-15' })

    const order = (await call(server, 'post', '/planning/transport-orders', {
      as: 'FLT001',
      body: { routeTemplateNo: 'TNR-ATS', plannedDeparture: '2026-09-12T06:00', deliveryRequestNos: ['DL-2026-0001'] }
    })).data.data as TransportOrderApi
    const planned = await call(server, 'post', `/planning/transport-orders/${order.no}/plan`, {
      as: 'FLT001',
      body: { means: 'carrier', carrierNo: 'PRS-016' }
    })
    const line = (planned.data.data as TransportOrderApi).lines[0]
    expect(line?.trackingToken).toHaveLength(32)
  })
})
