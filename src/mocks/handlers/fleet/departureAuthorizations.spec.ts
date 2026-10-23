import { beforeEach, describe, expect, it } from 'vitest'
import type { DepartureAuthorizationApi } from '@/modules/fleet/departure-authorizations/types/departureAuthorization.types'
import type { TripApi } from '@/modules/fleet/trips/types/trip.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}) =>
  call(server, 'post', path, { as: 'FLT001', body, language: 'fr' })

async function authorization(no = 'AUT-2026-0007') {
  return (
    await call(server, 'get', `/fleet/departure-authorizations/${no}`, {
      as: 'FLT001',
      language: 'fr'
    })
  ).data.data as DepartureAuthorizationApi
}

const check = (item: DepartureAuthorizationApi, code: string) =>
  item.checks.find((candidate) => candidate.code === code)

async function points(scope: string) {
  const page = (
    await call(server, 'get', '/fleet/check-points', { as: 'FLT001', query: { pageSize: 100 } })
  ).data.data as { items: { no: string; scope: string }[] }
  return page.items.filter((point) => point.scope === scope).map((point) => point.no)
}

describe('a pending departure request', () => {
  it('checks the departure live, and grants it when everything passes', async () => {
    const pending = await authorization()
    expect(pending.checks.map((item) => item.code)).toEqual([
      'checklist',
      'vehicle',
      'trailer',
      'vehicleDocuments',
      'driver',
      'rest',
      'weeklyRest',
      'driverChecks'
    ])
    expect(pending).toMatchObject({ decision: 'pending', ready: true, checklistNo: 'CKL-00005' })

    const granted = await post('/fleet/departure-authorizations/AUT-2026-0007/grant')
    expect(granted.data.data).toMatchObject({ decision: 'granted', decidedBy: 'FLT001' })
    const trip = (await call(server, 'get', '/fleet/trips/TRP-00007', { as: 'FLT001' })).data
      .data as TripApi
    expect(trip).toMatchObject({
      authorizationNo: 'AUT-2026-0007',
      authorizationDecision: 'granted'
    })
    expect((await post('/fleet/trips/TRP-00007/start')).status).toBe(200)
  })

  it('is held back by a blocking anomaly on the latest departure checklist', async () => {
    const results = (await points('vehicle')).map((pointNo) =>
      pointNo === 'FRS'
        ? { pointNo, result: 'anomaly', comment: 'Garde au frein trop longue' }
        : { pointNo, result: 'ok' }
    )
    await post('/fleet/road-checklists', {
      tripNo: 'TRP-00007',
      stage: 'departure',
      takenAt: '2026-09-04T09:50',
      results
    })
    const blocked = await authorization()
    expect(check(blocked, 'checklist')).toMatchObject({ ok: false })
    expect(check(blocked, 'checklist')?.detail).toContain('Frein de service')
    const grant = await post('/fleet/departure-authorizations/AUT-2026-0007/grant')
    expect(grant.status).toBe(422)
    expect(grant.data.message).toContain('Frein de service')
  })

  it('is held back by a failed driver check', async () => {
    const driverChecks = (await points('driver')).map((pointNo) =>
      pointNo === 'ALC'
        ? { pointNo, result: 'anomaly', comment: 'Test positif' }
        : { pointNo, result: 'ok' }
    )
    await call(server, 'patch', '/fleet/departure-authorizations/AUT-2026-0007', {
      as: 'FLT001',
      body: { driverChecks }
    })
    expect(check(await authorization(), 'driverChecks')).toMatchObject({ ok: false })
  })

  it('is held back when the vehicle becomes unusable', async () => {
    await post('/fleet/vehicles/VEH-007/out-of-service', { reason: 'Fuite de liquide de frein' })
    expect(check(await authorization(), 'vehicle')).toMatchObject({ ok: false })
  })
})

describe('departure decisions', () => {
  it('allow one request per planned trip', async () => {
    const driverChecks = (await points('driver')).map((pointNo) => ({ pointNo, result: 'ok' }))
    expect(
      (await post('/fleet/departure-authorizations', { tripNo: 'TRP-00007', driverChecks })).status
    ).toBe(409)
    expect(
      (await post('/fleet/departure-authorizations', { tripNo: 'TRP-00006', driverChecks })).status
    ).toBe(409)
    expect(
      (await post('/fleet/departure-authorizations', { tripNo: 'TRP-00008', driverChecks: [] }))
        .status
    ).toBe(422)
  })

  it('refuse with a reason, and let the trip ask again', async () => {
    expect((await post('/fleet/departure-authorizations/AUT-2026-0007/refuse')).status).toBe(422)
    const refused = await post('/fleet/departure-authorizations/AUT-2026-0007/refuse', {
      reason: 'Conducteur à remplacer'
    })
    expect(refused.data.data).toMatchObject({ decision: 'refused' })
    expect((await post('/fleet/trips/TRP-00007/start')).status).toBe(409)
    const driverChecks = (await points('driver')).map((pointNo) => ({ pointNo, result: 'ok' }))
    expect(
      (await post('/fleet/departure-authorizations', { tripNo: 'TRP-00007', driverChecks })).status
    ).toBe(201)
  })

  it('freeze the checks as they stood at the decision', async () => {
    await post('/fleet/departure-authorizations/AUT-2026-0007/grant')
    await post('/fleet/vehicles/VEH-007/out-of-service', { reason: 'Panne' })
    expect(check(await authorization(), 'vehicle')).toMatchObject({ ok: true })
    // The trip still checks the vehicle when it leaves.
    expect((await post('/fleet/trips/TRP-00007/start')).status).toBe(422)
  })
})
