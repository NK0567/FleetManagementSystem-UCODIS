import { beforeEach, describe, expect, it } from 'vitest'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const path = '/planning/delivery-requests'
const send = (
  method: 'post' | 'patch',
  url: string,
  body: Record<string, unknown> = {},
  as = 'COM001'
) => call(server, method, url, { as, body, language: 'en' })
const get = async (no: string) =>
  (await call(server, 'get', `${path}/${no}`, { as: 'FLT001' })).data.data as DeliveryRequestApi

const entry = {
  ordererNo: 'CLI-002',
  deliveryPointNo: 'DP-005',
  productNo: 'PRD-001',
  quantity: 120,
  desiredDate: '2026-09-09'
}

describe('delivery requests', () => {
  it('number the year, read the status and name the recipient', async () => {
    const created = await send('post', path, { ...entry, externalReference: 'LPA-7000' })
    expect(created.status).toBe(201)
    expect(created.data.data).toMatchObject({
      no: 'DL-2026-0012',
      status: 'pending',
      origin: 'request',
      freightPayer: 'orderer',
      recipientName: 'Shoprite Antsirabe',
      unit: 'Carton'
    })
    expect((await get('DL-2026-0005')).status).toBe('expired')
    expect((await get('DL-2026-0006')).status).toBe('rejected')
  })

  it('refuse a past date, a non-orderer, a duplicate reference and a profile without rights', async () => {
    expect((await send('post', path, { ...entry, desiredDate: '2026-09-01' })).status).toBe(422)
    expect((await send('post', path, { ...entry, ordererNo: 'CLI-001' })).status).toBe(422)
    expect((await send('post', path, { ...entry, externalReference: ' lpa-5512 ' })).status).toBe(
      409
    )
    expect((await send('post', path, entry, 'DEP001')).status).toBe(403)
  })

  it('let the planner reject with a listed reason, and a correction resubmit', async () => {
    const reject = `${path}/DL-2026-0001/reject`
    expect((await send('post', reject, { reasonNo: 'REJ-INCOMPLETE' })).status).toBe(403)
    expect((await send('post', reject, { reasonNo: 'CXL-CUSTOMER' }, 'FLT001')).status).toBe(422)
    const rejected = await send(
      'post',
      reject,
      { reasonNo: 'REJ-ZONE', comment: 'Hors zone' },
      'FLT001'
    )
    expect(rejected.data.data).toMatchObject({
      status: 'rejected',
      rejectionReasonName: 'Destination non desservie'
    })
    expect((await send('post', reject, { reasonNo: 'REJ-ZONE' }, 'FLT001')).status).toBe(409)
    const corrected = await send('patch', `${path}/DL-2026-0001`, { quantity: 400 })
    expect(corrected.data.data).toMatchObject({ status: 'pending', rejectedAt: null })
  })

  it('cancel with a reason, after which nothing changes', async () => {
    const cancel = `${path}/DL-2026-0002/cancel`
    const cancelled = await send('post', cancel, { reasonNo: 'CXL-CUSTOMER' })
    expect(cancelled.data.data).toMatchObject({ status: 'cancelled' })
    expect((await send('patch', `${path}/DL-2026-0002`, { quantity: 10 })).status).toBe(409)
    expect((await send('post', cancel, { reasonNo: 'CXL-CUSTOMER' })).status).toBe(409)
  })

  it('split a part out and merge the waiting parts back', async () => {
    const split = `${path}/DL-2026-0001/split`
    expect((await send('post', split, { quantity: 100 })).status).toBe(403)
    expect((await send('post', split, { quantity: 420 }, 'FLT001')).status).toBe(422)
    const part = await send('post', split, { quantity: 105 }, 'FLT001')
    expect(part.data.data).toMatchObject({
      no: 'DL-2026-0012',
      parentNo: 'DL-2026-0001',
      quantity: 105,
      weightKg: 1575,
      externalReference: ''
    })
    expect(await get('DL-2026-0001')).toMatchObject({ quantity: 315, weightKg: 4725 })
    const merge = `${path}/DL-2026-0012/merge`
    expect((await send('post', merge, {}, 'FLT001')).status).toBe(409)
    const merged = await send('post', `${path}/DL-2026-0001/merge`, {}, 'FLT001')
    expect(merged.data.data).toMatchObject({ quantity: 420, weightKg: 6300 })
    expect((await call(server, 'get', `${path}/DL-2026-0012`, { as: 'FLT001' })).status).toBe(404)
  })

  it('import each line through the same checks as an entry', async () => {
    const rows = [
      { ...entry, externalReference: 'LPA-8001' },
      { ...entry, deliveryPointNo: 'DP-999' },
      { ...entry, desiredDate: '2026-08-01' }
    ]
    const report = (await send('post', `${path}/import`, { rows })).data.data as {
      created: number
      rejected: number
    }
    expect(report).toMatchObject({ created: 1, rejected: 2 })
    expect((await get('DL-2026-0012')).origin).toBe('import')
  })
})
