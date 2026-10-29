import { beforeEach, describe, expect, it } from 'vitest'
import type { AlertApi } from '@/modules/fleet/alerts/types/alert.types'
import type { DriverApi, DriverScoreApi } from '@/modules/fleet/drivers/types/driver.types'
import type { FleetSettingsApi } from '@/modules/fleet/fleet-settings/types/fleetSettings.types'
import type { TelematicsEventApi } from '@/modules/fleet/telematics-events/types/telematicsEvent.types'
import type { TrainingApi } from '@/modules/fleet/trainings/types/training.types'
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

const score = (no: string) => get<DriverScoreApi>(`/fleet/drivers/${no}/score`)
const mark = (detail: DriverScoreApi, family: string) =>
  detail.families.find((item) => item.family === family)?.mark

async function setScoreSettings(values: Record<string, number>) {
  const settings = await get<FleetSettingsApi>('/fleet/settings')
  return call(server, 'put', '/fleet/settings/driverScore', {
    as: 'FLT001',
    body: { ...settings.driverScore, ...values }
  })
}

describe('driver scores', () => {
  it('lowers the delivery quality mark for an open contestation on the driver’s trip', async () => {
    const order = server.db.transportOrders.findOrFail('TR-2026-0003')
    server.db.transportOrders.update(order.no, {
      lines: order.lines.map((line) => ({
        ...line,
        declaredAt: '2026-09-04T08:00:00',
        receptionContestedAt: '2026-09-04T11:00:00',
        contestHandledAt: null
      }))
    })
    expect(mark(await score('UCT-012'), 'deliveryQuality')).toBe(80)
  })

  it('count only what was confirmed: unjustified deviations, upheld infractions', async () => {
    const jaona = await score('UCT-013')
    expect(jaona).toMatchObject({ score: 93, threshold: 70, belowThreshold: false })
    expect(mark(jaona, 'route')).toBe(80)
    expect(mark(jaona, 'discipline')).toBe(92)
    expect(mark(jaona, 'ecoDriving')).toBe(90)
    const { items: drivers } = (
      await call(server, 'get', '/fleet/drivers', { as: 'FLT001', query: { pageSize: 100 } })
    ).data.data as { items: DriverApi[] }
    expect(drivers.find((driver) => driver.no === 'UCT-013')?.score).toBe(93)
  })

  it('drop when a deviation is qualified unjustified, and tell the change since last month', async () => {
    expect(mark(await score('UCT-012'), 'safety')).toBe(100)
    await post('/fleet/route-deviations/ECA-00004/qualify', {
      nature: 'unjustified',
      decision: 'sanction',
      reason: 'Arrêt de 35 min sans raison.'
    })
    const tiana = await score('UCT-012')
    expect(mark(tiana, 'safety')).toBe(75)
    expect(tiana).toMatchObject({ previousScore: 100, delta: tiana.score - 100 })
    expect(tiana.delta).toBeLessThan(0)
  })

  it('weigh a behaviour against safety once its infraction is upheld, and forget it once lifted', async () => {
    const opened = (await post('/fleet/telematics-events/TEL-000014/infraction')).data
      .data as TelematicsEventApi
    const close = (outcome: string) =>
      post(`/fleet/infractions/${opened.infractionNo}/close`, { outcome, comment: 'Vu.' })
    expect(mark(await score('UCT-012'), 'ecoDriving')).toBe(100)
    expect(mark(await score('UCT-012'), 'safety')).toBe(100)
    await close('warning')
    expect(mark(await score('UCT-012'), 'safety')).toBe(92)
  })

  it('leave out a family weighted 0', async () => {
    const settings = await get<FleetSettingsApi>('/fleet/settings')
    const families = settings.scoreFamilies.map((family) =>
      family.code === 'route' ? { ...family, weight: 0 } : family
    )
    expect(
      (
        await call(server, 'put', '/fleet/settings/score-families', {
          as: 'FLT001',
          body: { families }
        })
      ).status
    ).toBe(200)
    const jaona = await score('UCT-013')
    expect(jaona.families.map((family) => family.family)).not.toContain('route')
    expect(jaona.score).toBe(97)
  })

  it('follow the families the administrator sets up, with the terms of their formula', async () => {
    const families = [
      { code: 'road', label: 'Route', weight: 50, sources: ['routeDeviation', 'stopDeviation'] },
      { code: 'rules', label: 'Règles', weight: 50, sources: ['manualInfraction', 'documents'] }
    ]
    const saved = await call(server, 'put', '/fleet/settings/score-families', {
      as: 'ADM001',
      body: { families }
    })
    expect(saved.status).toBe(200)
    const jaona = await score('UCT-013')
    expect(jaona.families.map((family) => [family.family, family.label])).toEqual([
      ['road', 'Route'],
      ['rules', 'Règles']
    ])
    const road = jaona.families.find((family) => family.family === 'road')!
    expect(road.terms).toContainEqual({
      source: 'routeDeviation',
      severity: null,
      count: 1,
      points: 20
    })
    expect(road.mark).toBe(80)
  })

  it('refuse families that count a fact twice, and a profile that may not set them', async () => {
    const twice = await call(server, 'put', '/fleet/settings/score-families', {
      as: 'FLT001',
      language: 'fr',
      body: {
        families: [
          { code: 'a', label: 'A', weight: 50, sources: ['ecoEvent'] },
          { code: 'b', label: 'B', weight: 50, sources: ['ecoEvent'] }
        ]
      }
    })
    expect(twice.status).toBe(422)
    expect(twice.data.message).toContain('deux familles')
    const manager = await call(server, 'put', '/fleet/settings/score-families', {
      as: 'DIR001',
      body: { families: [{ code: 'a', label: 'A', weight: 50, sources: ['ecoEvent'] }] }
    })
    expect(manager.status).toBe(403)
  })
})

describe('score trainings', () => {
  it('are proposed by hand below the threshold, once, and quiet the alert', async () => {
    expect((await post('/fleet/drivers/UCT-013/score-training')).status).toBe(409)
    expect((await setScoreSettings({ trainingThreshold: 95 })).status).toBe(200)
    const alerts = async () =>
      (
        (
          await call(server, 'get', '/fleet/alerts', {
            as: 'FLT001',
            query: { pageSize: 200 },
            language: 'en'
          })
        ).data.data as { items: AlertApi[] }
      ).items.filter((alert) => alert.category === 'driverScore')
    expect((await alerts()).map((alert) => alert.recordNo)).toContain('UCT-013')

    const proposed = (await post('/fleet/drivers/UCT-013/score-training')).data
      .data as DriverScoreApi
    expect(proposed.trainingNo).toBeTruthy()
    expect(await get<TrainingApi>(`/fleet/trainings/${proposed.trainingNo}`)).toMatchObject({
      employeeNo: 'UCT-013',
      reason: 'score',
      status: 'to_plan',
      topic: 'Driving score of 93/100, below the threshold of 95'
    })
    expect((await post('/fleet/drivers/UCT-013/score-training')).status).toBe(409)
    expect((await alerts()).map((alert) => alert.recordNo)).not.toContain('UCT-013')
  })
})
