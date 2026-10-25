import { beforeEach, describe, expect, it } from 'vitest'
import type {
  StockItemApi,
  StockMovementApi
} from '@/modules/maintenance/stock-items/types/stockItem.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

const item = (no: string) => get<StockItemApi>(`/maintenance/stock-items/${no}`)
const adjust = (no: string, body: Record<string, unknown>, as = 'FLT001') =>
  call(server, 'post', `/maintenance/stock-items/${no}/adjust`, { as, body, language: 'en' })

describe('stock items', () => {
  it('derive the stock from the ledger, its value and its state', async () => {
    expect(await item('FLT-HUI-HW')).toMatchObject({
      stockQuantity: 14,
      stockValue: 630_000,
      status: 'available',
      supplierName: 'Filtres & Lubrifiants Océan Indien'
    })
    expect((await item('FLT-GAZ-HW')).status).toBe('low')
    expect((await item('BV-FOT-EST')).status).toBe('out')
    const ledger = await get<StockMovementApi[]>('/maintenance/stock-items/HUI-15W40/movements')
    expect(ledger.map((movement) => movement.delta)).toEqual([-2, 24])
    expect(ledger[0]).toMatchObject({ workOrderNo: 'OT-2026-0001', vehiclePlate: '4021 TBA' })
  })

  it('correct a count with an explained adjustment, never below zero', async () => {
    expect((await adjust('GRN-STD', { delta: -1, reason: 'Court' })).status).toBe(422)
    expect((await adjust('GRN-STD', { delta: 1.5, reason: 'Inventaire du mois' })).status).toBe(422)
    expect((await adjust('GRN-STD', { delta: -9, reason: 'Inventaire du mois' })).status).toBe(422)
    expect(
      (await adjust('GRN-STD', { delta: -1, reason: 'Inventaire du mois' }, 'MNT001')).status
    ).toBe(403)
    const adjusted = (await adjust('GRN-STD', { delta: -2, reason: 'Inventaire du mois' })).data
      .data as StockItemApi
    expect(adjusted).toMatchObject({ stockQuantity: 6, status: 'available' })
    const ledger = await get<StockMovementApi[]>('/maintenance/stock-items/GRN-STD/movements')
    expect(ledger[0]).toMatchObject({ kind: 'adjustment', delta: -2, recordedBy: 'FLT001' })
  })

  it('refuse a subsystem code of another kind and keep the stock out of the form', async () => {
    const create = (body: Record<string, unknown>) =>
      call(server, 'post', '/maintenance/stock-items', {
        as: 'FLT001',
        body: {
          no: 'COUR-HW',
          name: 'Courroie Howo',
          unitPrice: 90_000,
          alertThreshold: 2,
          ...body
        },
        language: 'en'
      })
    expect((await create({ subsystemNo: 'LEAK' })).status).toBe(422)
    const created = (await create({ subsystemNo: 'ENGINE', stockQuantity: 50 })).data
      .data as StockItemApi
    expect(created).toMatchObject({ stockQuantity: 0, status: 'out' })
  })
})
