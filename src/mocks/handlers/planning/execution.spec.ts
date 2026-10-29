import { beforeEach, describe, expect, it } from 'vitest'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const act = (url: string, body: Record<string, unknown> = {}, as = 'PLN001') =>
  call(server, 'post', url, { as, body, language: 'en' })

async function readyCarrier() {
  await act('/planning/transport-orders/TR-2026-0004/lines/1/confirm', {}, 'CLI001')
  await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
    as: 'DEP001',
    body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
  })
  await act('/planning/transport-orders/TR-2026-0004/lines/1/conform', {}, 'DEP001')
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
    expect(declared.data.data).toMatchObject({ delivered: true, status: 'in_progress' })
    const order = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0004', { as: 'PLN001' })
    ).data.data as TransportOrderApi
    expect(order.status).toBe('in_progress')
    expect(order.awaitingClosing).toBe(true)
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
    // The delivery manager must say whether the driver is accountable (TRS03-US17).
    expect(
      (
        await act(
          '/planning/transport-orders/TR-2026-0004/lines/1/qualify',
          { kind: 'loss', comment: 'Manquant' },
          'LIV001'
        )
      ).status
    ).toBe(400)
    const qualified = await act(
      '/planning/transport-orders/TR-2026-0004/lines/1/qualify',
      {
        kind: 'loss',
        comment: 'Manquant',
        imputableToDriver: true
      },
      'LIV001'
    )
    expect(qualified.status).toBe(200)
    expect(server.db.transportOrders.find('TR-2026-0004')!.lines[0]!.gapImputableToDriver).toBe(
      true
    )
    expect(
      (
        await act(
          '/planning/transport-orders/TR-2026-0004/lines/1/qualify',
          {
            kind: 'gain',
            comment: 'Non'
          },
          'LIV001'
        )
      ).status
    ).toBe(409)

    const settings = server.db.planningSettings.findOrFail('PLANNING')
    server.db.planningSettings.update('PLANNING', {
      quantities: { ...settings.quantities, overToleranceMode: 'block' }
    })
    // On a fleet order, the planner no longer declares: the driver does, from his space.
    expect(
      (
        await act('/planning/transport-orders/TR-2026-0003/lines/1/declare', {
          receivedQuantity: 1
        })
      ).status
    ).toBe(409)
    expect((await driverDeclare('TR-2026-0003', 1, { receivedQuantity: 1 })).status).toBe(422)
  })

  it('refuses a line, which settles the order', async () => {
    await readyCarrier()
    await act('/planning/transport-orders/TR-2026-0004/depart')
    const refused = await act('/planning/transport-orders/TR-2026-0004/lines/1/refuse', {
      reasonNo: 'RFS-DAMAGED'
    })
    expect(refused.data.data).toMatchObject({ delivered: true, status: 'in_progress' })
  })
})
