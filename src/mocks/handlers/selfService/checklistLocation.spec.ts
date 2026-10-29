import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function send(location: unknown) {
  const tour = (await call(server, 'get', '/me/tour', { as: 'CND001' })).data.data as {
    checkPoints: { no: string }[]
  }
  const results = tour.checkPoints.map((point) => ({
    pointNo: point.no,
    result: 'ok',
    comment: ''
  }))
  return call(server, 'post', '/me/checklist', {
    as: 'CND001',
    body: { stage: 'stop', takenAt: '2026-09-04T05:40', results, location }
  })
}

describe('stopping place of a road checklist', () => {
  it('keeps the place the driver names and shows it to the fleet', async () => {
    const saved = await send('  Relais Moramanga ')
    expect(saved.status).toBe(201)
    const no = (saved.data.data as { no: string }).no
    const card = await call(server, 'get', `/fleet/road-checklists/${no}`, { as: 'FLT001' })
    expect(card.data.data).toMatchObject({ location: 'Relais Moramanga' })
  })

  it('refuses a place that is not a short text', async () => {
    expect((await send('x'.repeat(121))).status).toBe(400)
    expect((await send(42)).status).toBe(400)
  })
})
