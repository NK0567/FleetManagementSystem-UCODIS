import { beforeEach, describe, expect, it } from 'vitest'
import type {
  RouteDeviationApi,
  RouteDeviationSummary
} from '@/modules/fleet/route-deviations/types/routeDeviation.types'
import type { TripApi } from '@/modules/fleet/trips/types/trip.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}) =>
  call(server, 'post', path, { as: 'FLT001', body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001' })).data.data as T
}

const qualify = (no: string, body: Record<string, unknown>) =>
  post(`/fleet/route-deviations/${no}/qualify`, body)

describe('route deviations', () => {
  it('give the compliance rate of finished trips', async () => {
    expect(await get<RouteDeviationSummary>('/fleet/route-deviations/summary')).toEqual({
      toQualify: 2,
      unjustified: 1,
      complianceRate: 80
    })
  })

  it('keep a trip from being closed until they are qualified', async () => {
    expect((await get<TripApi>('/fleet/trips/TRP-00001')).deviationsToQualify).toBe(1)
    const blocked = await post('/fleet/trips/TRP-00001/close')
    expect(blocked.status).toBe(409)
    expect(blocked.data.message).toContain('1')
    await qualify('ECA-00003', { nature: 'endured', reason: 'Client fermé, livraison inversée.' })
    expect((await post('/fleet/trips/TRP-00001/close')).data.data).toMatchObject({
      status: 'closed'
    })
  })

  it('are justified once, within the set delay', async () => {
    const justify = (no: string) =>
      post(`/fleet/route-deviations/${no}/justify`, { justification: 'Contrôle de police' })
    expect((await justify('ECA-00004')).data.data).toMatchObject({ justifiedBy: 'FLT001' })
    expect((await justify('ECA-00004')).status).toBe(409)
    expect((await justify('ECA-00003')).status).toBe(409)
  })

  it('sanction only an unjustified deviation, with a reason, once', async () => {
    expect(
      (await qualify('ECA-00004', { nature: 'authorized', decision: 'sanction', reason: 'x' }))
        .status
    ).toBe(422)
    expect(
      (await qualify('ECA-00004', { nature: 'unjustified', decision: 'sanction' })).status
    ).toBe(422)
    const qualified = await qualify('ECA-00004', {
      nature: 'unjustified',
      decision: 'sanction',
      reason: 'Arrêt de 35 min sans raison, deuxième fois ce mois.'
    })
    expect(qualified.data.data).toMatchObject({
      nature: 'unjustified',
      qualification: { decision: 'sanction', by: 'FLT001' }
    })
    expect((await qualify('ECA-00004', { nature: 'endured', reason: 'x' })).status).toBe(409)
    const edit = await call(server, 'patch', '/fleet/route-deviations/ECA-00004', {
      as: 'FLT001',
      body: { location: 'Ailleurs' }
    })
    expect(edit.status).toBe(409)
  })

  it('are recorded on an open trip, with an active type and its usual severity', async () => {
    const record = (body: Record<string, unknown>) =>
      post('/fleet/route-deviations', {
        tripNo: 'TRP-00006',
        deviationTypeNo: 'OFF-ROUTE',
        detectedAt: '2026-09-04T09:30',
        location: 'Behenjy',
        ...body
      })
    const created = (await record({})).data.data as RouteDeviationApi
    expect(created).toMatchObject({ severity: 'major', source: 'manual', nature: 'to_qualify' })
    expect((await record({ deviationTypeNo: 'CONTINUOUS-DRIVING' })).status).toBe(422)
    expect((await record({ tripNo: 'TRP-00002' })).status).toBe(409)
    const removal = await call(server, 'delete', '/fleet/deviation-types/OFF-ROUTE', {
      as: 'FLT001'
    })
    expect(removal.status).toBe(409)
  })
})
