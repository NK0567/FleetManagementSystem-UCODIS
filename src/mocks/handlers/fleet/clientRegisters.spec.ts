import { beforeEach, describe, expect, it } from 'vitest'
import type { DriverReportApi } from '@/modules/fleet/driver-reports/types/driverReport.types'
import type { MedicalFollowUpApi } from '@/modules/fleet/medical-follow-ups/types/medicalFollowUp.types'
import type { TripDebriefApi } from '@/modules/fleet/trip-debriefs/types/tripDebrief.types'
import { todayIso } from '@/utils/date'
import { FLEET_SETTINGS_NO } from '../../fixtures/fleet/settings'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const send = (method: 'get' | 'post' | 'patch', url: string, body?: unknown, as = 'FLT001') =>
  call(server, method, url, { as, body, language: 'fr' })

describe('driver reports', () => {
  const NEW = () => ({
    employeeNo: 'UCT-012',
    subject: 'Rétroviseur cassé',
    kind: 'technical',
    severity: 'minor',
    urgency: 'to_plan',
    channel: 'app',
    occurredOn: todayIso(),
    reportedOn: todayIso()
  })

  it('creates a report and tells whether it came within 24 hours', async () => {
    const response = await send('post', '/fleet/driver-reports', NEW())
    expect(response.status).toBe(201)
    const report = response.data.data as DriverReportApi
    expect(report).toMatchObject({ status: 'open', within24h: true, closedOn: null })
    const old = server.db.driverReports.findOrFail('REM-00006')
    expect(old.reportedOn > old.occurredOn).toBe(true)
    const listed = (
      (await send('get', '/fleet/driver-reports')).data.data as { items: DriverReportApi[] }
    ).items
    expect(listed.find((row) => row.no === 'REM-00006')?.within24h).toBe(false)
  })

  it('refuses a report that comes before the facts or lies in the future', async () => {
    const before = await send('post', '/fleet/driver-reports', {
      ...NEW(),
      occurredOn: todayIso(),
      reportedOn: '2000-01-01'
    })
    expect(before.status).toBe(422)
    const future = await send('post', '/fleet/driver-reports', {
      ...NEW(),
      occurredOn: '2999-01-01',
      reportedOn: '2999-01-02'
    })
    expect(future.status).toBe(422)
  })

  it('cannot close without an action, and a closed report no longer changes', async () => {
    const created = (await send('post', '/fleet/driver-reports', NEW())).data
      .data as DriverReportApi
    const refused = await send('patch', `/fleet/driver-reports/${created.no}`, {
      status: 'closed'
    })
    expect(refused.status).toBe(422)
    const closed = await send('patch', `/fleet/driver-reports/${created.no}`, {
      status: 'closed',
      actionText: 'Rétroviseur remplacé.'
    })
    expect(closed.data.data).toMatchObject({ status: 'closed', closedOn: todayIso() })
    const again = await send('patch', `/fleet/driver-reports/${created.no}`, { subject: 'Autre' })
    expect(again.status).toBe(409)
  })
})

describe('medical follow-ups', () => {
  const NEW = () => ({ employeeNo: 'UCT-012', kind: 'visit', doneOn: todayIso(), result: 'fit' })

  it('derives the status from the result and the renewal date', async () => {
    const list = (
      (await send('get', '/fleet/medical-follow-ups')).data.data as { items: MedicalFollowUpApi[] }
    ).items
    const status = (no: string) => list.find((row) => row.no === no)?.status
    expect(status('MED-00001')).toBe('compliant')
    expect(status('MED-00003')).toBe('non_compliant')
    expect(status('MED-00006')).toBe('pending')
    expect(list.find((row) => row.no === 'MED-00003')?.overdue).toBe(true)
  })

  it('refuses a result that does not fit the kind, and a positive result without follow-up', async () => {
    const mismatch = await send('post', '/fleet/medical-follow-ups', {
      ...NEW(),
      kind: 'alcohol_test',
      result: 'fit'
    })
    expect(mismatch.status).toBe(422)
    const bare = await send('post', '/fleet/medical-follow-ups', {
      ...NEW(),
      kind: 'drug_test',
      result: 'positive'
    })
    expect(bare.status).toBe(422)
    const withFollowUp = await send('post', '/fleet/medical-follow-ups', {
      ...NEW(),
      kind: 'drug_test',
      result: 'positive',
      followUp: 'Contre-analyse demandée.'
    })
    expect(withFollowUp.data.data).toMatchObject({ status: 'non_compliant' })
  })

  it('is not open to the driver', async () => {
    expect((await send('get', '/fleet/medical-follow-ups', undefined, 'CND001')).status).toBe(403)
  })
})

describe('trip debriefs', () => {
  const NEW = () => ({
    voucherNo: 'OT-26-9999',
    employeeNo: 'UCT-012',
    vehicleNo: 'VEH-001',
    startKm: 1000,
    endKm: 1500,
    overspeed: 3,
    harshBraking: 1,
    plan: [{ place: 'Marozevo', plannedTime: '02:20', actualTime: '02:35', allowed: 'pause' }]
  })

  it('computes distance, infractions and the rate per 1000 km', async () => {
    const response = await send('post', '/fleet/trip-debriefs', NEW())
    expect(response.status).toBe(201)
    expect(response.data.data as TripDebriefApi).toMatchObject({
      status: 'draft',
      distanceKm: 500,
      infractionTotal: 4,
      infractionRate: 8
    })
  })

  it('refuses inconsistent mileage, dates, plan times and a voucher used twice', async () => {
    expect((await send('post', '/fleet/trip-debriefs', { ...NEW(), endKm: 900 })).status).toBe(422)
    expect(
      (
        await send('post', '/fleet/trip-debriefs', {
          ...NEW(),
          loadedOn: '2026-01-10',
          unloadedOn: '2026-01-09'
        })
      ).status
    ).toBe(422)
    expect(
      (
        await send('post', '/fleet/trip-debriefs', {
          ...NEW(),
          plan: [{ place: 'Marozevo', plannedTime: '25:99' }]
        })
      ).status
    ).toBe(422)
    expect(
      (await send('post', '/fleet/trip-debriefs', { ...NEW(), voucherNo: 'OT-26-0412' })).status
    ).toBe(409)
  })

  it('closes only once both parties signed, and a change cancels the signatures', async () => {
    const created = (await send('post', '/fleet/trip-debriefs', NEW())).data.data as TripDebriefApi
    const url = `/fleet/trip-debriefs/${created.no}`
    expect((await send('post', `${url}/close`)).status).toBe(409)
    await send('post', `${url}/sign`, { party: 'driver' })
    expect((await send('post', `${url}/sign`, { party: 'driver' })).status).toBe(409)
    const signed = await send('post', `${url}/sign`, { party: 'manager' })
    expect(signed.data.data).toMatchObject({ status: 'signed' })
    const edited = await send('patch', url, { events: 'Retard à Moramanga.' })
    expect(edited.data.data).toMatchObject({ status: 'draft', driverSignedOn: null })
    await send('post', `${url}/sign`, { party: 'driver' })
    await send('post', `${url}/sign`, { party: 'manager' })
    expect((await send('post', `${url}/close`)).data.data).toMatchObject({ status: 'closed' })
    expect((await send('patch', url, { events: 'Trop tard.' })).status).toBe(409)
  })

  it('cannot be signed without mileage', async () => {
    const created = (
      await send('post', '/fleet/trip-debriefs', {
        ...NEW(),
        voucherNo: 'OT-26-8888',
        startKm: null,
        endKm: null
      })
    ).data.data as TripDebriefApi
    const refused = await send('post', `/fleet/trip-debriefs/${created.no}/sign`, {
      party: 'driver'
    })
    expect(refused.status).toBe(422)
  })
})

describe('driver space reports', () => {
  it('lets a driver report from his phone, under his own name, and read only his own', async () => {
    const sent = await send(
      'post',
      '/me/reports',
      { kind: 'safety', severity: 'major', subject: 'Nid de poule profond au PK 120' },
      'CND001'
    )
    expect(sent.status).toBe(201)
    expect(sent.data.data).toMatchObject({
      employeeNo: 'UCT-012',
      channel: 'app',
      status: 'open',
      within24h: true
    })
    const mine = (await send('get', '/me/reports', undefined, 'CND001')).data.data as {
      employeeNo: string
    }[]
    expect(mine.length).toBeGreaterThan(0)
    expect(mine.every((report) => report.employeeNo === 'UCT-012')).toBe(true)
  })

  it('refuses a report without subject, a future date, and an assistant who may only read', async () => {
    expect((await send('post', '/me/reports', { kind: 'safety' }, 'CND001')).status).toBe(400)
    expect(
      (
        await send(
          'post',
          '/me/reports',
          { kind: 'safety', subject: 'Sujet', occurredOn: '2999-01-01' },
          'CND001'
        )
      ).status
    ).toBe(422)
    expect(
      (await send('post', '/me/reports', { kind: 'safety', subject: 'Sujet valide' }, 'AID001'))
        .status
    ).toBe(403)
  })
})

describe('settings behind the new registers', () => {
  function setSafety(patch: Record<string, number>) {
    const current = server.db.fleetSettings.findOrFail(FLEET_SETTINGS_NO)
    server.db.fleetSettings.update(FLEET_SETTINGS_NO, {
      safety: { ...current.safety, ...patch }
    })
  }

  it('judges the reporting delay with the delay of the fleet settings', async () => {
    const find = async () =>
      (
        (await send('get', '/fleet/driver-reports')).data.data as { items: DriverReportApi[] }
      ).items.find((row) => row.no === 'REM-00006')
    expect((await find())?.within24h).toBe(false)
    setSafety({ reportTargetDays: 30 })
    expect((await find())?.within24h).toBe(true)
  })

  it('counts the infraction rate on the base distance of the fleet settings', async () => {
    setSafety({ infractionRateBaseKm: 100 })
    const response = await send('post', '/fleet/trip-debriefs', {
      voucherNo: 'OT-26-7777',
      employeeNo: 'UCT-012',
      vehicleNo: 'VEH-001',
      startKm: 1000,
      endKm: 1500,
      overspeed: 4
    })
    expect((response.data.data as TripDebriefApi).infractionRate).toBe(0.8)
  })
})
