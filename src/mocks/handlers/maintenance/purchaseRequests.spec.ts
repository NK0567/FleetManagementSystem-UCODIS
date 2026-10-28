import { beforeEach, describe, expect, it } from 'vitest'
import type { PurchaseRequestApi } from '@/modules/maintenance/purchase-requests/types/purchaseRequest.types'
import type { StockItemApi } from '@/modules/maintenance/stock-items/types/stockItem.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', `/maintenance${path}`, { as, body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', `/maintenance${path}`, { as: 'FLT001', language: 'en' })).data
    .data as T
}

const order = (no: string) => get<WorkOrderApi>(`/work-orders/${no}`)
const item = (no: string) => get<StockItemApi>(`/stock-items/${no}`)

describe('parts on work orders', () => {
  it('cost the parts received on an order', async () => {
    expect(await order('OT-2026-0001')).toMatchObject({ partsCost: 153_000, pendingPartCount: 0 })
    expect(await order('OT-2026-0002')).toMatchObject({ partsCost: 35_000, totalCost: 95_000 })
  })

  it('take parts from stock, never more than is there', async () => {
    expect(
      (
        await post(
          '/work-orders/OT-2026-0003/take-part',
          { itemNo: 'GRN-STD', quantity: 100 },
          'MNT001'
        )
      ).status
    ).toBe(422)
    const taken = (
      await post(
        '/work-orders/OT-2026-0003/take-part',
        { itemNo: 'GRN-STD', quantity: 2 },
        'MNT001'
      )
    ).data.data as WorkOrderApi
    expect(taken).toMatchObject({ partsCost: 130_000, pendingPartCount: 0 })
    expect((await item('GRN-STD')).stockQuantity).toBe(6)
    expect(
      (await post('/work-orders/OT-2026-0001/take-part', { itemNo: 'GRN-STD', quantity: 1 })).status
    ).toBe(409)
  })

  it('wait for a bought part before the finish, then receive it into the order', async () => {
    const requested = (
      await post(
        '/purchase-requests',
        { workOrderNo: 'OT-2026-0003', itemNo: 'FLT-AIR-HW', quantity: 1 },
        'MNT001'
      )
    ).data.data as PurchaseRequestApi
    expect(requested).toMatchObject({
      no: 'DA-2026-0003',
      label: 'Filtre à air Howo',
      estimatedAmount: 68_000,
      status: 'requested'
    })
    expect((await order('OT-2026-0003')).pendingPartCount).toBe(1)

    await post(
      '/work-orders/OT-2026-0003/labour',
      { technicianNo: 'UCT-008', date: DEMO_REFERENCE_DATE, hours: 1 },
      'MNT001'
    )
    const early = await post(
      '/work-orders/OT-2026-0003/complete',
      { workDone: 'Garnitures et filtre remplacés.', odometerKm: 165_900 },
      'MNT001'
    )
    expect(early.status).toBe(422)

    const path = `/purchase-requests/${requested.no}`
    expect((await post(`${path}/receive`)).status).toBe(409)
    expect(
      (await post(`${path}/order`, { orderNumber: 'BC-1', supplierNo: 'PRS-013' }, 'MNT001')).status
    ).toBe(403)
    expect(
      (await post(`${path}/order`, { orderNumber: 'BC-1', supplierNo: 'PRS-002' })).status
    ).toBe(422)
    await post(`${path}/order`, { orderNumber: 'BC-2026-0100', supplierNo: 'PRS-013' })
    const received = (await post(`${path}/receive`, { finalAmount: 70_000 })).data
      .data as PurchaseRequestApi
    expect(received).toMatchObject({ status: 'received', finalAmount: 70_000, leadTimeDays: 0 })
    expect((await item('FLT-AIR-HW')).stockQuantity).toBe(9)
    expect(await order('OT-2026-0003')).toMatchObject({ pendingPartCount: 0, partsCost: 70_000 })
    expect(
      (
        await post(
          '/work-orders/OT-2026-0003/complete',
          { workDone: 'Garnitures et filtre remplacés.', odometerKm: 165_900 },
          'MNT001'
        )
      ).data.data
    ).toMatchObject({ status: 'awaiting_validation' })
  })

  it('restock the store from a request with no order', async () => {
    await post('/purchase-requests/DA-2026-0001/receive')
    expect(await item('BV-FOT-EST')).toMatchObject({ stockQuantity: 1, status: 'low' })
    expect((await get<PurchaseRequestApi>('/purchase-requests/DA-2026-0001')).status).toBe(
      'received'
    )
  })

  it('cancel with a reason and drop the pending line from the order', async () => {
    const { no } = (
      await post(
        '/purchase-requests',
        { workOrderNo: 'OT-2026-0003', label: 'Capteur ABS', quantity: 1 },
        'MNT001'
      )
    ).data.data as PurchaseRequestApi
    expect((await post(`/purchase-requests/${no}/cancel`, { reason: 'Doublon' })).status).toBe(422)
    expect(
      (
        await post(
          `/purchase-requests/${no}/cancel`,
          { reason: 'Pièce trouvée au dépôt.' },
          'MNT001'
        )
      ).status
    ).toBe(403)
    expect(
      (
        (await post(`/purchase-requests/${no}/cancel`, { reason: 'Pièce trouvée au dépôt.' })).data
          .data as PurchaseRequestApi
      ).status
    ).toBe('cancelled')
    expect((await order('OT-2026-0003')).pendingPartCount).toBe(0)
    expect(
      (await post('/purchase-requests/DA-2026-0002/cancel', { reason: 'Trop tard pour cela.' }))
        .status
    ).toBe(409)
  })
})
