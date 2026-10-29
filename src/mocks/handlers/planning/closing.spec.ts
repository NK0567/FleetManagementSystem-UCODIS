import { beforeEach, describe, expect, it } from 'vitest'
import type { FileMeta } from '@/types/file.types'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'PLN001') =>
  call(server, 'post', url, { as, body, language: 'en' })

async function upload() {
  const form = new FormData()
  form.append('file', new File(['%PDF-1.4 note'], 'note.pdf', { type: 'application/pdf' }))
  return (
    (await call(server, 'post', '/files', { as: 'PLN001', body: form })).data.data as FileMeta
  ).no
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

describe('closing', () => {
  it('closes a delivered order once the reception is attested and the documents are filed', async () => {
    const order = '/planning/transport-orders/TR-2026-0003'
    expect((await post(`${order}/close`)).status).toBe(422)
    expect((await post(`${order}/debriefing`, { voucherNo: 'BL-1' }, 'LIV001')).status).toBe(200)
    expect(
      (
        await post(
          `${order}/debriefing`,
          {
            voucherNo: 'BL-1',
            loadedAt: '2026-09-04T12:00',
            unloadedAt: '2026-09-04T08:00'
          },
          'LIV001'
        )
      ).status
    ).toBe(422)
    await driverDeclare('TR-2026-0003', 1, { receivedQuantity: 150 })
    const blocked = await post(`${order}/close`)
    expect(blocked.status).toBe(422)
    expect(blocked.data.message).toContain('reception')
    await post(`${order}/lines/1/receive-confirm`, { signer: 'Rabe' }, 'CLI001')
    expect(
      (await post(`${order}/documents`, { kind: 'loading_list', fileNo: 'FIL-000000' }, 'LIV001'))
        .status
    ).toBe(400)
    const loading = await upload()
    const note = await upload()
    await post(`${order}/documents`, { kind: 'loading_list', fileNo: loading }, 'LIV001')
    expect(
      (await post(`${order}/documents`, { kind: 'loading_list', fileNo: note }, 'LIV001')).status
    ).toBe(409)
    await post(`${order}/documents`, { kind: 'delivery_note', fileNo: note }, 'LIV001')
    const closed = await post(`${order}/close`)
    expect(closed.data.data).toMatchObject({ status: 'closed' })
    const stored = (await call(server, 'get', order, { as: 'PLN001' })).data
      .data as TransportOrderApi
    expect(stored.status).toBe('completed')
    // Final, it joins the archives view and can no longer change (TRS05-US06).
    expect(stored.archived).toBe(true)
    const archives = (
      await call(server, 'get', '/planning/transport-orders', {
        as: 'PLN001',
        query: {
          pageSize: 50,
          filters: JSON.stringify([{ field: 'archived', valueType: 'boolean', value: true }])
        }
      })
    ).data.data as { items: TransportOrderApi[] }
    expect(archives.items.map((item) => item.no)).toEqual(['TR-2026-0003'])
    expect(
      (await call(server, 'put', order, { as: 'PLN001', body: { comment: 'x' } })).status
    ).not.toBe(200)
    expect((await post(`${order}/close`)).status).toBe(409)
    expect((await post(`${order}/cancel`, { reasonNo: 'CXL-CUSTOMER' })).status).toBe(409)
  })

  it('refuses to close while a gap is unqualified, and a draft has not left', async () => {
    await post('/planning/transport-orders/TR-2026-0004/lines/1/confirm', {}, 'CLI001')
    await call(server, 'put', '/planning/transport-orders/TR-2026-0004/loading', {
      as: 'DEP001',
      body: { lines: [{ lineNo: 1, loadedQuantity: 60 }] }
    })
    await post('/planning/transport-orders/TR-2026-0004/lines/1/conform', {}, 'DEP001')
    await post('/planning/transport-orders/TR-2026-0004/depart')
    await post('/planning/transport-orders/TR-2026-0004/lines/1/declare', { receivedQuantity: 50 })
    const blocked = await post('/planning/transport-orders/TR-2026-0004/close')
    expect(blocked.status).toBe(422)
    expect(blocked.data.message).toContain('gap')
    expect(
      (
        await post(
          '/planning/transport-orders/TR-2026-0001/debriefing',
          { voucherNo: 'BL-2' },
          'LIV001'
        )
      ).status
    ).toBe(409)
  })
})
