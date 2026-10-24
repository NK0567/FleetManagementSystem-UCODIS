import { beforeEach, describe, expect, it } from 'vitest'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import type { DowntimeApi } from '@/modules/maintenance/downtimes/types/downtime.types'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const send = (
  method: 'post' | 'patch',
  path: string,
  body: Record<string, unknown> = {},
  as = 'FLT001'
) => call(server, method, path, { as, body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

const declare = (body: Record<string, unknown>, as = 'FLT001') =>
  send(
    'post',
    '/maintenance/downtimes',
    {
      vehicleNo: 'VEH-008',
      downtimeCodeNo: 'ABS',
      startedAt: `${DEMO_REFERENCE_DATE}T08:00`,
      ...body
    },
    as
  )

describe('downtimes', () => {
  it('count days in fractions, cost them by vehicle kind and immobilize the vehicle', async () => {
    expect(await get<DowntimeApi>('/maintenance/downtimes/IND-00004')).toMatchObject({
      status: 'open',
      family: 'technical',
      durationDays: 1.83,
      cost: 823_500
    })
    expect(await get<DowntimeApi>('/maintenance/downtimes/IND-00002')).toMatchObject({
      status: 'closed',
      family: 'administrative',
      durationDays: 7.33
    })
    expect(await get<VehicleApi>('/fleet/vehicles/VEH-008')).toMatchObject({
      status: 'immobilized',
      statusReason: 'Unavailable: Panne'
    })
  })

  it('let several causes keep a vehicle out, but not the same one twice', async () => {
    expect((await declare({ downtimeCodeNo: 'PNN' })).status).toBe(409)
    expect((await declare({ startedAt: `${DEMO_REFERENCE_DATE}T11:00` })).status).toBe(422)
    await send('patch', '/maintenance/downtime-codes/ADM', { active: false })
    expect((await declare({ downtimeCodeNo: 'ADM' })).status).toBe(422)
    expect((await declare({}, 'MNT001')).status).toBe(201)
  })

  it('end once, between the start and now, and set the vehicle free', async () => {
    const end = (body: Record<string, unknown>, as = 'FLT001') =>
      send('post', '/maintenance/downtimes/IND-00004/end', body, as)
    expect((await end({ comment: 'Démarreur changé.' }, 'MNT001')).status).toBe(403)
    expect((await end({ endedAt: '2026-08-01T08:00' })).status).toBe(422)
    const ended = (await end({ comment: 'Démarreur changé.' })).data.data as DowntimeApi
    expect(ended).toMatchObject({
      status: 'closed',
      endedBy: 'FLT001',
      endComment: 'Démarreur changé.'
    })
    expect((await end({})).status).toBe(409)
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-008')).status).toBe('assigned')
    const requalified = await send('patch', '/maintenance/downtimes/IND-00004', {
      downtimeCodeNo: 'ATP',
      startedAt: '2026-01-01T00:00'
    })
    expect(requalified.data.data).toMatchObject({
      downtimeCodeNo: 'ATP',
      startedAt: ended.startedAt
    })
  })

  it('refuse a vehicle that has left the fleet', async () => {
    await send(
      'post',
      '/fleet/vehicles/VEH-019/remove',
      { reason: 'Vendu', date: DEMO_REFERENCE_DATE },
      'ADM001'
    )
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-019')).status).toBe('removed')
    expect((await declare({ vehicleNo: 'VEH-019' })).status).toBe(422)
  })
})
