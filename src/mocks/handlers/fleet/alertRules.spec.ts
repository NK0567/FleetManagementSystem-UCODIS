import { beforeEach, describe, expect, it } from 'vitest'
import type { AlertRuleApi } from '@/modules/fleet/alert-rules/types/alertRule.types'
import type { AlertApi, InboxApi } from '@/modules/fleet/alerts/types/alert.types'
import type { DocumentApi } from '@/modules/fleet/documents/types/document.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const rule = async (no: string) =>
  (await call(server, 'get', `/fleet/alert-rules/${no}`, { as: 'ADM001', language: 'fr' })).data
    .data as AlertRuleApi

const update = (no: string, body: Record<string, unknown>, as = 'ADM001') =>
  call(server, 'patch', `/fleet/alert-rules/${no}`, { as, body, language: 'fr' })

async function alerts(as = 'FLT001') {
  return (
    (await call(server, 'get', '/fleet/alerts', { as, query: { pageSize: 200 }, language: 'fr' }))
      .data.data as { items: AlertApi[] }
  ).items
}

describe('alert rules', () => {
  it('carry the event, its threshold, the recipients, the severity and the channels', async () => {
    expect(await rule('document')).toMatchObject({
      no: 'document',
      severity: 'by_case',
      email: true,
      emailTo: ['flotte@ucodis.mg'],
      thresholdPath: '/fleet/document-types'
    })
    expect((await rule('document')).threshold).toContain('30 jours')
    expect((await rule('driverScore')).threshold).toContain('70')
  })

  it('force their severity on the alerts, and send by the channels they set', async () => {
    expect(
      (await update('departure', { severity: 'critical', sms: true, smsTo: ['034 11 222 33'] }))
        .status
    ).toBe(200)
    const departure = (await alerts()).find((alert) => alert.no === 'departure.AUT-2026-0007')
    expect(departure).toMatchObject({ severity: 'critical' })
    expect(departure?.notifications).toEqual([
      { channel: 'sms', to: '034 11 222 33', sentAt: departure?.since }
    ])
  })

  it('refuse a channel without address, a bad address, and a profile that may not set them', async () => {
    expect((await update('departure', { email: true, emailTo: [] })).status).toBe(422)
    expect((await update('departure', { email: true, emailTo: ['pas-une-adresse'] })).status).toBe(
      400
    )
    expect((await update('departure', { severity: 'urgent' })).status).toBe(400)
    expect((await update('departure', { severity: 'critical' }, 'MNT001')).status).toBe(403)
    expect((await update('departure', { severity: 'critical' }, 'DIR001')).status).toBe(403)
  })
})

describe('document notifications', () => {
  it('go by e-mail and SMS to the addresses of the document rule, and show on the document', async () => {
    const documents = (
      await call(server, 'get', '/fleet/documents', { as: 'FLT001', query: { pageSize: 200 } })
    ).data.data as { items: DocumentApi[] }
    const alerting = documents.items.filter((row) => row.notifications.length)
    expect(alerting.length).toBeGreaterThan(0)
    expect(alerting.every((row) => row.current && row.mandatory && row.state !== 'valid')).toBe(
      true
    )
    expect(alerting[0]!.notifications.map((item) => item.channel)).toEqual(['email', 'sms'])
    await update('document', { email: false, sms: false })
    const after = (
      await call(server, 'get', '/fleet/documents', { as: 'FLT001', query: { pageSize: 200 } })
    ).data.data as { items: DocumentApi[] }
    expect(after.items.every((row) => row.notifications.length === 0)).toBe(true)
  })
})

describe('road checklist alerts', () => {
  it('raise one for any point in anomaly on the road, until a work order takes it up', async () => {
    const found = (await alerts()).find((alert) => alert.no === 'checklist.CKL-00005')
    expect(found).toMatchObject({ category: 'checklist', severity: 'warning' })
    const opened = await call(server, 'post', '/maintenance/work-orders/from-source', {
      as: 'FLT001',
      body: { origin: 'road_checklist', originNo: 'CKL-00005' }
    })
    expect([200, 201]).toContain(opened.status)
    expect((await alerts()).find((alert) => alert.no === 'checklist.CKL-00005')).toBeUndefined()
  })
})

describe('the bell', () => {
  it('gathers the open alerts and the requests the user may decide', async () => {
    const inbox = (await call(server, 'get', '/inbox', { as: 'FLT001' })).data.data as InboxApi
    expect(inbox.alertCount).toBeGreaterThan(0)
    expect(
      inbox.alerts.every((alert) => alert.status === 'new' || alert.status === 'acknowledged')
    ).toBe(true)
    expect(inbox.requests.map((request) => request.kind)).toEqual(
      expect.arrayContaining(['leave', 'companyDocument', 'departure'])
    )
  })

  it('holds nothing the user could not open', async () => {
    const driver = (await call(server, 'get', '/inbox', { as: 'CND001' })).data.data as InboxApi
    expect(driver).toMatchObject({ alertCount: 0, requestCount: 0 })
    const technician = (await call(server, 'get', '/inbox', { as: 'MNT001' })).data.data as InboxApi
    expect(technician.requestCount).toBe(0)
    expect(technician.alerts.every((alert) => alert.category !== 'departure')).toBe(true)
    expect((await call(server, 'get', '/inbox')).status).toBe(401)
  })
})
