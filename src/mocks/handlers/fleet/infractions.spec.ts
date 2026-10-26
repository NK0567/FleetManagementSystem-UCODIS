import { beforeEach, describe, expect, it } from 'vitest'
import type { InfractionApi } from '@/modules/fleet/infractions/types/infraction.types'
import type { TrainingApi } from '@/modules/fleet/trainings/types/training.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}) =>
  call(server, 'post', path, { as: 'FLT001', body })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001' })).data.data as T
}

async function trainings() {
  return (
    (await call(server, 'get', '/fleet/trainings', { as: 'FLT001', query: { pageSize: 100 } })).data
      .data as { items: TrainingApi[] }
  ).items
}

const record = (body: Record<string, unknown> = {}) =>
  post('/fleet/infractions', {
    infractionTypeNo: 'PHONE',
    occurredAt: '2026-09-03T09:00',
    location: 'Route d’Andraharo',
    vehicleNo: 'VEH-006',
    driverNo: 'UCT-015',
    ...body
  })

describe('recording an infraction', () => {
  it('numbers it by year and takes the usual severity of its type', async () => {
    const response = await record()
    expect(response.status).toBe(201)
    expect(response.data.data).toMatchObject({
      no: 'INF-2026-006',
      severity: 'major',
      status: 'new',
      source: 'manual'
    })
  })

  it('refuses the same infraction twice within ten minutes, and a future date', async () => {
    await record()
    const twin = await record({ occurredAt: '2026-09-03T09:07' })
    expect(twin.status).toBe(409)
    expect(twin.data.message).toContain('INF-2026-006')
    expect((await record({ occurredAt: '2026-09-03T09:15' })).status).toBe(201)
    expect((await record({ occurredAt: '2026-09-05T09:00' })).status).toBe(422)
  })

  it('refuses an inactive type, and keeps a type used by infractions', async () => {
    await call(server, 'patch', '/fleet/infraction-types/PHONE', {
      as: 'FLT001',
      body: { active: false }
    })
    expect((await record()).status).toBe(422)
    const removal = await call(server, 'delete', '/fleet/infraction-types/SPEED', { as: 'FLT001' })
    expect(removal.status).toBe(409)
  })
})

describe('handling', () => {
  it('is taken once, then closed with an outcome and an explanation', async () => {
    expect((await post('/fleet/infractions/INF-2026-003/take')).data.data).toMatchObject({
      status: 'in_progress',
      handlerCode: 'FLT001'
    })
    expect((await post('/fleet/infractions/INF-2026-003/take')).status).toBe(409)
    expect(
      (await post('/fleet/infractions/INF-2026-003/close', { outcome: 'warning' })).status
    ).toBe(422)
    const closed = await post('/fleet/infractions/INF-2026-003/close', {
      outcome: 'dismissed',
      comment: 'Le véhicule était au dépôt ce jour-là.'
    })
    expect(closed.data.data).toMatchObject({ status: 'closed', upheld: false })
    expect(
      (await post('/fleet/infractions/INF-2026-003/close', { outcome: 'warning', comment: 'x' }))
        .status
    ).toBe(409)
  })

  it('sends the driver to a training when the outcome calls for it', async () => {
    const before = await trainings()
    const closed = await post('/fleet/infractions/INF-2026-002/close', {
      outcome: 'training',
      comment: 'Usage du téléphone répété.'
    })
    const infraction = closed.data.data as InfractionApi
    expect(infraction).toMatchObject({ upheld: true })
    const created = (await trainings()).find((training) => training.no === infraction.trainingNo)
    expect(created).toMatchObject({
      employeeNo: 'UCT-011',
      reason: 'infraction',
      originNo: 'INF-2026-002',
      status: 'to_plan'
    })
    expect(await trainings()).toHaveLength(before.length + 1)
  })

  it('cannot send to a training an infraction without a driver', async () => {
    const response = await post('/fleet/infractions/INF-2026-003/close', {
      outcome: 'training',
      comment: 'À former.'
    })
    expect(response.status).toBe(422)
    expect((await get<InfractionApi>('/fleet/infractions/INF-2026-003')).status).toBe('new')
  })
})

describe('trainings', () => {
  it('are attended only once planned, never on a future date', async () => {
    expect(
      (await post('/fleet/trainings/FOR-00003/attend', { attendedOn: '2026-09-04' })).status
    ).toBe(409)
    expect(
      (await post('/fleet/trainings/FOR-00004/attend', { attendedOn: '2026-09-20' })).status
    ).toBe(422)
    const attended = await post('/fleet/trainings/FOR-00004/attend', {
      attendedOn: '2026-09-04',
      result: 'Acquis'
    })
    expect(attended.data.data).toMatchObject({ status: 'attended', result: 'Acquis' })
    const edit = await call(server, 'patch', '/fleet/trainings/FOR-00004', {
      as: 'FLT001',
      body: { trainer: 'Autre' }
    })
    expect(edit.status).toBe(409)
  })

  it('are cancelled with a reason', async () => {
    expect((await post('/fleet/trainings/FOR-00005/cancel')).status).toBe(422)
    expect(
      (await post('/fleet/trainings/FOR-00005/cancel', { reason: 'Score remonté' })).data.data
    ).toMatchObject({ status: 'cancelled' })
  })

  it('are planned in the future and not twice for the same origin', async () => {
    const plan = (body: Record<string, unknown>) =>
      post('/fleet/trainings', {
        employeeNo: 'UCT-013',
        topic: 'Excès de vitesse',
        reason: 'infraction',
        ...body
      })
    expect((await plan({ originNo: 'INF-2026-001' })).status).toBe(409)
    expect((await plan({ plannedOn: '2026-09-01' })).status).toBe(422)
    expect((await plan({ plannedOn: '2026-09-15' })).data.data).toMatchObject({
      status: 'planned'
    })
  })
})

describe('claims', () => {
  it('send the driver to a training once per claim', async () => {
    expect((await post('/fleet/claims/SIN-2026-002/training', { topic: 'Ville' })).status).toBe(409)
    const created = await post('/fleet/claims/SIN-2026-003/training', {
      topic: 'Contrôle des raccords avant chargement'
    })
    expect(created.data.data).toMatchObject({
      employeeNo: 'UCT-017',
      reason: 'incident',
      originNo: 'SIN-2026-003'
    })
  })
})
