import { beforeEach, describe, expect, it } from 'vitest'
import type { AlertApi } from '@/modules/fleet/alerts/types/alert.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function alerts(as = 'FLT001') {
  return (
    (await call(server, 'get', '/fleet/alerts', { as, query: { pageSize: 200 }, language: 'fr' }))
      .data.data as { items: AlertApi[] }
  ).items
}

const find = (items: AlertApi[], key: string) => items.find((alert) => alert.no === key)

describe('alerts', () => {
  it('come from the fleet records, under a key that never carries the state', async () => {
    const items = await alerts()
    expect(find(items, 'departure.AUT-2026-0007')).toMatchObject({
      category: 'departure',
      status: 'new',
      path: '/fleet/departure-authorizations',
      recordNo: 'AUT-2026-0007'
    })
    expect(find(items, 'deviation.ECA-00004')).toMatchObject({ severity: 'critical' })
    expect(find(items, 'inspection.INS-00004')).toMatchObject({
      status: 'acknowledged',
      acknowledgedBy: 'MNT001'
    })
    expect(find(items, 'training.FOR-00003')).toMatchObject({ severity: 'info' })
    expect(
      items.some((alert) => alert.category === 'document' && alert.severity === 'critical')
    ).toBe(true)
  })

  it('keep what was done with a signal that went away, as resolved', async () => {
    expect(find(await alerts(), 'departure.AUT-2026-0006')).toMatchObject({
      status: 'resolved',
      handledBy: 'FLT001',
      comment: 'Départ accordé après la check-list.'
    })
  })

  it('reach the escalation profile once left new past the delay of their rule', async () => {
    const management = await alerts('DIR001')
    expect(find(management, 'departure.AUT-2026-0007')).toMatchObject({ escalated: true })
    expect(find(management, 'training.FOR-00003')).toBeUndefined()
    const technician = await alerts('MNT001')
    expect(
      technician.every((alert) =>
        ['checklist', 'equipment', 'inspection', 'tyre'].includes(alert.category)
      )
    ).toBe(true)
  })

  it('are taken in charge once, then handled with a comment', async () => {
    const act = (action: string, body = {}, as = 'FLT001') =>
      call(server, 'post', `/fleet/alerts/training.FOR-00003/${action}`, { as, body })
    expect((await act('acknowledge', {}, 'DIR001')).status).toBe(403)
    expect((await act('acknowledge')).data.data).toMatchObject({
      status: 'acknowledged',
      acknowledgedBy: 'FLT001'
    })
    expect((await act('acknowledge')).status).toBe(409)
    expect((await act('handle')).status).toBe(422)
    expect(
      (await act('handle', { comment: 'Session prévue avec l’auto-école' })).data.data
    ).toMatchObject({
      status: 'handled'
    })
  })

  it('resolve on their own when the situation is settled', async () => {
    await call(server, 'post', '/fleet/departure-authorizations/AUT-2026-0007/grant', {
      as: 'FLT001'
    })
    expect(find(await alerts(), 'departure.AUT-2026-0007')).toBeUndefined()

    await call(server, 'post', '/fleet/alerts/deviation.ECA-00004/acknowledge', { as: 'FLT001' })
    await call(server, 'post', '/fleet/route-deviations/ECA-00004/qualify', {
      as: 'FLT001',
      body: { nature: 'endured', reason: 'Panne de la route, convoi arrêté.' }
    })
    expect(find(await alerts(), 'deviation.ECA-00004')).toMatchObject({ status: 'resolved' })
  })

  it('follow their rule: an inactive rule hides its alerts', async () => {
    await call(server, 'patch', '/fleet/alert-rules/training', {
      as: 'FLT001',
      body: { active: false }
    })
    expect((await alerts()).some((alert) => alert.category === 'training')).toBe(false)
  })
})
