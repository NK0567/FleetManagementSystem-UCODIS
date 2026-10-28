import { beforeEach, describe, expect, it } from 'vitest'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const act = (url: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', url, { as, body, language: 'en' })

async function readyCarrier() {
  await act('/planning/transport-orders/TR-2026-0004/lines/1/confirm', {}, 'CLI001')
  await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
    as: 'DEP001',
    body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
  })
  await act('/planning/transport-orders/TR-2026-0004/lines/1/conform', {}, 'DEP001')
}

describe('delivery execution', () => {
  it('records a carrier departure and settles the order when the quantity is declared', async () => {
    await readyCarrier()
    expect(
      (
        await act('/planning/transport-orders/TR-2026-0004/lines/1/declare', {
          receivedQuantity: 60
        })
      ).status
    ).toBe(409)
    const left = await act('/planning/transport-orders/TR-2026-0004/depart')
    expect(left.data.data).toMatchObject({ status: 'in_progress' })
    const declared = await act('/planning/transport-orders/TR-2026-0004/lines/1/declare', {
      receivedQuantity: 60
    })
    expect(declared.data.data).toMatchObject({ delivered: true, status: 'delivered' })
    const order = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0004', { as: 'FLT001' })
    ).data.data as TransportOrderApi
    expect(order.status).toBe('delivered')
    expect(
      (await act('/planning/transport-orders/TR-2026-0004/cancel', { reasonNo: 'CXL-CUSTOMER' }))
        .status
    ).toBe(409)
  })

  it('keeps an out-of-tolerance gap and qualifies a loss, and blocks it when the setting says so', async () => {
    await readyCarrier()
    await act('/planning/transport-orders/TR-2026-0004/depart')
    const flagged = await act('/planning/transport-orders/TR-2026-0004/lines/1/declare', {
      receivedQuantity: 50
    })
    expect(flagged.status).toBe(200)
    const qualified = await act('/planning/transport-orders/TR-2026-0004/lines/1/qualify', {
      kind: 'loss',
      comment: 'Manquant'
    })
    expect(qualified.status).toBe(200)
    expect(
      (
        await act('/planning/transport-orders/TR-2026-0004/lines/1/qualify', {
          kind: 'gain',
          comment: 'Non'
        })
      ).status
    ).toBe(409)

    const settings = server.db.planningSettings.findOrFail('PLANNING')
    server.db.planningSettings.update('PLANNING', {
      quantities: { ...settings.quantities, overToleranceMode: 'block' }
    })
    expect(
      (
        await act('/planning/transport-orders/TR-2026-0003/lines/1/declare', {
          receivedQuantity: 1
        })
      ).status
    ).toBe(422)
  })

  it('refuses a line, which settles the order', async () => {
    await readyCarrier()
    await act('/planning/transport-orders/TR-2026-0004/depart')
    const refused = await act('/planning/transport-orders/TR-2026-0004/lines/1/refuse', {
      reasonNo: 'RFS-DAMAGED'
    })
    expect(refused.data.data).toMatchObject({ delivered: true, status: 'delivered' })
  })
})
