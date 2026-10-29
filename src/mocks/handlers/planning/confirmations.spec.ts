import { beforeEach, describe, expect, it } from 'vitest'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import type { ConfirmationLineApi } from './confirmations'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
  // A second agent of the confirmation team, with the same role as CLI001.
  const agent = server.db.userAccounts.findOrFail('CLI001')
  server.db.userAccounts.insert({ ...agent, no: 'CLI002', name: 'Second agent' })
})

const send = (
  method: 'post' | 'get',
  url: string,
  body: Record<string, unknown> = {},
  as = 'CLI001'
) => call(server, method, url, { as, body, language: 'en' })

describe('recipient confirmation', () => {
  it('lists the lines of planned orders and confirms them for the call agent', async () => {
    const listed = await send('get', '/planning/confirmations')
    const lines = listed.data.data as ConfirmationLineApi[]
    expect(lines.some((line) => line.orderNo === 'TR-2026-0002' && line.state === 'pending')).toBe(
      true
    )
    expect(lines.some((line) => line.orderNo === 'TR-2026-0001')).toBe(false)
    expect(
      (await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/confirm', {}, 'COM001'))
        .status
    ).toBe(403)
    const confirmed = await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/confirm')
    expect(confirmed.data.data).toMatchObject({ state: 'confirmed' })
    const order = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0002', { as: 'PLN001' })
    ).data.data as TransportOrderApi
    expect(order.status).toBe('confirmed')
    expect(
      (await send('post', '/planning/transport-orders/TR-2026-0003/lines/1/confirm')).status
    ).toBe(409)
  })

  it('serves the queue by departure and keeps a taken line for its agent', async () => {
    const lines = (await send('get', '/planning/confirmations')).data.data as ConfirmationLineApi[]
    const departures = lines.map((line) => line.plannedDeparture ?? '9999')
    expect(departures).toEqual([...departures].sort())
    expect(lines[0]).toHaveProperty('notificationChannel')
    const free = lines.find((line) => line.state === 'pending' && !line.agent)!
    const path = `/planning/transport-orders/${free.orderNo}/lines/${free.lineNo}`
    expect((await send('post', `${path}/take`)).data.data).toMatchObject({ agent: 'CLI001' })
    // Another agent can neither take nor confirm it until it is released.
    expect((await send('post', `${path}/take`, {}, 'CLI002')).status).toBe(409)
    expect((await send('post', `${path}/confirm`, {}, 'CLI002')).status).toBe(409)
    await send('post', `${path}/release`)
    expect((await send('post', `${path}/take`, {}, 'CLI002')).status).toBe(200)
  })

  it('leaves the retained date to the planner, who takes the line into the pending order of that day', async () => {
    const line = '/planning/transport-orders/TR-2026-0002/lines/1'
    await send('post', `${line}/unavailable`, { reasonNo: 'UNV-CLOSED', availableOn: '2026-09-10' })
    const proposed = await send('post', `${line}/client-date`, { date: '2026-09-12' })
    expect(proposed.data.data).toMatchObject({ clientProposedOn: '2026-09-12' })
    // Retaining a date is the planner's (TRS01-US16), never the agent's.
    expect((await send('post', `${line}/accept-date`, { date: '2026-09-12' })).status).toBe(404)
    expect((await send('post', `${line}/replan`, {})).status).toBe(403)
    const pending = await send('post', `${line}/replan`, {}, 'PLN001')
    expect(pending.status).toBe(200)
    const order = pending.data.data as TransportOrderApi
    expect(order).toMatchObject({ status: 'draft', replanDate: '2026-09-12' })
    expect(order.lines[0]).toMatchObject({
      deliveryRequestNo: 'DL-2026-0009',
      replannedFrom: { orderNo: 'TR-2026-0002', lineNo: 1 },
      weightKg: 6000
    })
    // The order (commande) follows its line: nothing is keyed again.
    const request = (
      await call(server, 'get', '/planning/delivery-requests/DL-2026-0009', { as: 'PLN001' })
    ).data.data as DeliveryRequestApi
    expect(request).toMatchObject({ transportOrderNo: order.no, desiredDate: '2026-09-12' })
    const queue = (await send('get', '/planning/confirmations')).data.data as ConfirmationLineApi[]
    expect(queue.find((item) => item.orderNo === 'TR-2026-0002' && item.lineNo === 1)?.state).toBe(
      'replanned'
    )
    expect((await send('post', `${line}/confirm`)).status).toBe(409)
  })

  it('refuses an unavailability without a reason from that list, and stamps a tracking token when planning', async () => {
    expect(
      (
        await send('post', '/planning/transport-orders/TR-2026-0002/lines/1/unavailable', {
          reasonNo: 'CXL-CUSTOMER'
        })
      ).status
    ).toBe(422)
    const unavailable = await send(
      'post',
      '/planning/transport-orders/TR-2026-0002/lines/1/unavailable',
      {
        reasonNo: 'UNV-CLOSED',
        availableOn: '2026-09-15'
      }
    )
    expect(unavailable.data.data).toMatchObject({ state: 'unavailable', availableOn: '2026-09-15' })

    const order = (
      await call(server, 'post', '/planning/transport-orders', {
        as: 'PLN001',
        body: {
          routeTemplateNo: 'TNR-ATS',
          plannedDeparture: '2026-09-12T06:00',
          deliveryRequestNos: ['DL-2026-0001']
        }
      })
    ).data.data as TransportOrderApi
    const planned = await call(server, 'post', `/planning/transport-orders/${order.no}/plan`, {
      as: 'PLN001',
      body: { means: 'carrier', carrierNo: 'PRS-016', carrierVehiclePlate: '2345 TBA' }
    })
    const line = (planned.data.data as { lines: { trackingToken: string | null }[] }).lines[0]
    expect(line?.trackingToken).toHaveLength(32)
  })
})
