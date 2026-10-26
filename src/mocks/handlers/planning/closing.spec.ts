import { beforeEach, describe, expect, it } from 'vitest'
import type { FileMeta } from '@/types/file.types'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', url, { as, body, language: 'en' })

async function upload() {
  const form = new FormData()
  form.append('file', new File(['%PDF-1.4 note'], 'note.pdf', { type: 'application/pdf' }))
  return ((await call(server, 'post', '/files', { as: 'FLT001', body: form })).data.data as FileMeta).no
}

describe('closing', () => {
  it('closes a delivered order once the reception is attested and the documents are filed', async () => {
    const order = '/planning/transport-orders/TR-2026-0003'
    expect((await post(`${order}/close`)).status).toBe(422)
    expect((await post(`${order}/debriefing`, { voucherNo: 'BL-1' })).status).toBe(200)
    expect(
      (await post(`${order}/debriefing`, { voucherNo: 'BL-1', loadedAt: '2026-09-04T12:00', unloadedAt: '2026-09-04T08:00' }))
        .status
    ).toBe(422)
    await post(`${order}/lines/1/declare`, { receivedQuantity: 150 })
    const blocked = await post(`${order}/close`)
    expect(blocked.status).toBe(422)
    expect(blocked.data.message).toContain('reception')
    await post(`${order}/lines/1/receive-confirm`, { signer: 'Rabe' }, 'CLI001')
    expect((await post(`${order}/documents`, { kind: 'loading_list', fileNo: 'FIL-000000' })).status).toBe(400)
    const loading = await upload()
    const note = await upload()
    await post(`${order}/documents`, { kind: 'loading_list', fileNo: loading })
    expect((await post(`${order}/documents`, { kind: 'loading_list', fileNo: note })).status).toBe(409)
    await post(`${order}/documents`, { kind: 'delivery_note', fileNo: note })
    const closed = await post(`${order}/close`)
    expect(closed.data.data).toMatchObject({ status: 'closed' })
    const stored = (await call(server, 'get', order, { as: 'FLT001' })).data.data as TransportOrderApi
    expect(stored.status).toBe('closed')
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
    expect((await post('/planning/transport-orders/TR-2026-0001/debriefing', { voucherNo: 'BL-2' })).status).toBe(409)
  })
})
