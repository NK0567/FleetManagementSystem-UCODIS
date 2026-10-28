import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlertApi } from '@/modules/fleet/alerts/types/alert.types'
import type { InfractionApi } from '@/modules/fleet/infractions/types/infraction.types'
import type { LivePositionApi } from '@/modules/fleet/live-map/types/liveMap.types'
import type { TelematicsEventApi } from '@/modules/fleet/telematics-events/types/telematicsEvent.types'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}) =>
  call(server, 'post', path, { as: 'FLT001', body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

async function list<T>(path: string) {
  return (
    (await call(server, 'get', path, { as: 'FLT001', query: { pageSize: 100 }, language: 'en' }))
      .data.data as { items: T[] }
  ).items
}

const positions = () => get<LivePositionApi[]>('/fleet/live/positions')
const vehicle = async (no: string) => (await positions()).find((row) => row.vehicleNo === no)
const at = (time: string) => vi.setSystemTime(new Date(`${DEMO_REFERENCE_DATE}T${time}:00`))

describe('live positions', () => {
  it('follow the trip on the road from its stops and the clock', async () => {
    const truck = await vehicle('VEH-003')
    expect(truck).toMatchObject({
      tripNo: 'TRP-00006',
      situation: 'moving',
      nextStopName: 'Contrôle Brickaville',
      nextStopExpectedAt: `${DEMO_REFERENCE_DATE}T11:02:00`,
      delayMin: 7
    })
    expect(truck?.stops.filter((stop) => stop.passed)).toHaveLength(2)
    expect(truck?.speedKmh).toBeGreaterThan(60)
    expect(truck?.longitude).toBeGreaterThan(48.1)
  })

  it('leave out the vehicles whose unit is out of order, and park the others at home', async () => {
    const all = await positions()
    expect(all.some((row) => row.vehicleNo === 'VEH-009')).toBe(false)
    expect(all.find((row) => row.vehicleNo === 'VEH-001')).toMatchObject({
      situation: 'parked',
      tripNo: null,
      speedKmh: 0,
      driverName: expect.any(String)
    })
  })

  it('lose the signal in a dead zone, and find it again once out', async () => {
    at('10:20')
    const silent = await vehicle('VEH-003')
    expect(silent).toMatchObject({ situation: 'signal_lost', speedKmh: 0 })
    expect((silent?.reportedAt ?? '') < `${DEMO_REFERENCE_DATE}T10:00:00`).toBe(true)
    await call(server, 'put', '/fleet/settings/telematics', {
      as: 'FLT001',
      body: { signalLossMin: 60 }
    })
    expect((await vehicle('VEH-003'))?.situation).toBe('moving')
    at('10:45')
    expect(await vehicle('VEH-003')).toMatchObject({
      situation: 'moving',
      reportedAt: `${DEMO_REFERENCE_DATE}T10:45:00`
    })
  })
})

describe('telematics events', () => {
  it('derive their place, their type and their status', async () => {
    const events = await list<TelematicsEventApi>('/fleet/telematics-events')
    expect(events.find((event) => event.no === 'TEL-000013')).toMatchObject({
      status: 'infraction',
      infractionNo: 'INF-2026-005'
    })
    expect(events.find((event) => event.no === 'TEL-000009')).toMatchObject({
      family: 'fault',
      siteName: 'Dépôt Tanjombato',
      status: 'new'
    })
  })

  it('record only readings past the threshold, once, and never in the future', async () => {
    const reading = {
      eventTypeNo: 'SPEEDING',
      vehicleNo: 'VEH-003',
      occurredAt: `${DEMO_REFERENCE_DATE}T09:00`,
      source: 'box',
      value: 95
    }
    expect((await post('/fleet/telematics-events', { ...reading, value: 85 })).status).toBe(422)
    const created = await post('/fleet/telematics-events', reading)
    expect(created.status).toBe(201)
    expect(created.data.data).toMatchObject({ tripNo: 'TRP-00006', driverNo: 'UCT-012' })
    expect(
      (
        await post('/fleet/telematics-events', {
          ...reading,
          occurredAt: `${DEMO_REFERENCE_DATE}T09:05`
        })
      ).status
    ).toBe(409)
    expect(
      (
        await post('/fleet/telematics-events', {
          ...reading,
          occurredAt: `${DEMO_REFERENCE_DATE}T11:00`
        })
      ).status
    ).toBe(422)
    const no = (created.data.data as TelematicsEventApi).no
    expect(
      (await call(server, 'patch', `/fleet/telematics-events/${no}`, { as: 'FLT001', body: {} }))
        .status
    ).toBe(405)
  })

  it('are acknowledged once', async () => {
    const done = await post('/fleet/telematics-events/TEL-000009/acknowledge', {
      comment: 'Ordre de travail demandé.'
    })
    expect(done.data.data).toMatchObject({ status: 'acknowledged', acknowledgedBy: 'FLT001' })
    expect((await post('/fleet/telematics-events/TEL-000009/acknowledge')).status).toBe(409)
  })

  it('open an infraction of the matching type, or join the one already recorded', async () => {
    expect((await post('/fleet/telematics-events/TEL-000009/infraction')).status).toBe(422)
    const opened = (await post('/fleet/telematics-events/TEL-000004/infraction')).data
      .data as TelematicsEventApi
    const infraction = await get<InfractionApi>(`/fleet/infractions/${opened.infractionNo}`)
    expect(infraction).toMatchObject({
      infractionTypeNo: 'DROWSINESS',
      source: 'telematics',
      vehicleNo: 'VEH-002',
      driverNo: 'UCT-011'
    })
    const manual = await post('/fleet/infractions', {
      infractionTypeNo: 'SPEED',
      occurredAt: `${DEMO_REFERENCE_DATE}T08:25`,
      location: 'RN2',
      vehicleNo: 'VEH-003'
    })
    const joined = (await post('/fleet/telematics-events/TEL-000014/infraction')).data
      .data as TelematicsEventApi
    expect(joined.infractionNo).toBe((manual.data.data as InfractionApi).no)
  })

  it('raise an alert while they wait, when their type says so', async () => {
    const alerts = async () =>
      (await list<AlertApi>('/fleet/alerts')).filter((alert) => alert.category === 'telematics')
    const before = await alerts()
    expect(before.map((alert) => alert.recordNo)).toContain('TEL-000004')
    expect(before.map((alert) => alert.recordNo)).not.toContain('TEL-000001')
    expect(before.map((alert) => alert.recordNo)).not.toContain('TEL-000003')
    await post('/fleet/telematics-events/TEL-000004/acknowledge')
    expect((await alerts()).map((alert) => alert.recordNo)).not.toContain('TEL-000004')
  })

  it('keep their type from being deleted', async () => {
    const response = await call(server, 'delete', '/fleet/telematics-event-types/SPEEDING', {
      as: 'FLT001'
    })
    expect(response.status).toBe(409)
  })
})
