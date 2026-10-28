import { beforeEach, describe, expect, it } from 'vitest'
import type {
  FleetStatusApi,
  FleetStatusDay
} from '@/modules/fleet/fleet-status/types/fleetStatus.types'
import { todayIso } from '@/utils/date'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function lines(query: Record<string, unknown> = {}) {
  const response = await call(server, 'get', '/fleet/fleet-status', {
    as: 'FLT001',
    language: 'en',
    query: { pageSize: 100, ...query }
  })
  return (response.data.data as { items: FleetStatusApi[] }).items
}

describe('fleet status of the day', () => {
  it('lists the motorized vehicles with their trailer, and the trailers left alone', async () => {
    const today = await lines()
    expect(today.map((line) => line.plate)).toContain('4021 TBA')
    expect(today.find((line) => line.plate === '4021 TBA')?.trailerPlate).toBe('RM 4101')
    expect(today.some((line) => line.plate === 'RM 4101')).toBe(false)
    expect(today.some((line) => line.plate === 'RM 4109')).toBe(true)
  })

  it('tells what each vehicle is doing', async () => {
    const today = await lines()
    expect(today.find((line) => line.plate === '4023 TBA')).toMatchObject({
      state: 'TO_DELIVERY',
      stateGroup: 'transit',
      mission: 'Antananarivo → Toamasina (RN2) · heading to Relais Moramanga',
      location: 'Relais Moramanga'
    })
    expect(today.find((line) => line.plate === '4027 TBA')?.state).toBe('TRIP_PLANNED')
    expect(today.find((line) => line.plate === '4029 TBA')).toMatchObject({
      state: 'IMMOBILIZED',
      immobilizationReason: 'Out of service: Accident, expertise en cours.'
    })
    expect(today.find((line) => line.plate === '4022 TBA')?.state).toBe('AVAILABLE')
  })

  it('keeps the note of the day and refuses a return to service in the past', async () => {
    const saved = await call(server, 'put', '/fleet/fleet-status/notes/VEH-009', {
      as: 'FLT001',
      body: { observation: 'Pièces commandées', expectedBackOn: '2099-01-01' }
    })
    expect(saved.data.data).toMatchObject({ observation: 'Pièces commandées' })
    const past = await call(server, 'put', '/fleet/fleet-status/notes/VEH-009', {
      as: 'FLT001',
      body: { observation: '', expectedBackOn: '2020-01-01' }
    })
    expect(past.status).toBe(422)
  })

  it('archives the day as it is and serves it unchanged afterwards', async () => {
    await call(server, 'post', '/fleet/fleet-status/archive', { as: 'FLT001', language: 'en' })
    const days = (await call(server, 'get', '/fleet/fleet-status/days', { as: 'FLT001' })).data
      .data as FleetStatusDay[]
    expect(days[0]).toMatchObject({ date: todayIso(), live: true, archivedBy: 'FLT001' })

    const archive = server.db.fleetStatusArchives.all()[0]
    expect(archive?.lines.length).toBe((await lines()).length)
    server.db.fleetStatusArchives.update(archive?.no ?? '', { date: '2026-01-02' })
    const archived = await lines({ date: '2026-01-02' })
    expect(archived.find((line) => line.plate === '4023 TBA')?.state).toBe('TO_DELIVERY')
  })

  it('lets management read without archiving', async () => {
    const response = await call(server, 'post', '/fleet/fleet-status/archive', { as: 'DIR001' })
    expect(response.status).toBe(403)
  })
})
