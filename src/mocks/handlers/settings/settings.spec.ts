import { beforeEach, describe, expect, it } from 'vitest'
import type { ActivityLogEntryApi } from '@/modules/settings/activity-log/types/activityLog.types'
import type { CompanySettingsApi } from '@/modules/settings/company/types/companySettings.types'
import type { UserAccountApi } from '@/modules/settings/user-accounts/types/userAccount.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const login = (userCode: string) =>
  call(server, 'post', '/auth/login', { body: { userCode, userPassword: 'demo' } })
const act = (path: string, body: Record<string, unknown> = {}, as = 'ADM001') =>
  call(server, 'post', `/settings/user-accounts${path}`, { as, body })

describe('accounts and roles', () => {
  it('creates an account with its role, which can sign in at once', async () => {
    const created = await act('', {
      no: 'mag001',
      name: 'Rado Magasin',
      profile: 'MAINTENANCE_TECHNICIAN'
    })
    expect(created.status).toBe(201)
    expect(created.data.data).toMatchObject({ no: 'MAG001', active: true })
    const signedIn = await login('MAG001')
    expect(signedIn.status).toBe(200)
    expect(signedIn.data.data).toMatchObject({ user: { profile: 'MAINTENANCE_TECHNICIAN' } })
    expect((await act('', { no: 'MAG001', name: 'Encore', profile: 'DRIVER' })).status).toBe(409)
    expect((await act('', { no: 'X1', name: 'Sans rôle' })).status).toBe(400)
  })

  it('locks a disabled account out, its open sessions included, until it is enabled', async () => {
    expect((await call(server, 'get', '/auth/profile', { as: 'PLN001' })).status).toBe(200)
    expect((await act('/PLN001/disable')).status).toBe(422)
    const disabled = await act('/PLN001/disable', { reason: 'Départ de la société' })
    expect(disabled.data.data).toMatchObject({ active: false, statusChangedBy: 'ADM001' })
    expect((await login('PLN001')).status).toBe(403)
    expect((await call(server, 'get', '/auth/profile', { as: 'PLN001' })).status).toBe(401)
    expect((await call(server, 'get', '/planning/transport-orders', { as: 'PLN001' })).status).toBe(
      401
    )
    expect((await act('/PLN001/disable', { reason: 'Encore' })).status).toBe(409)
    const demo = (await call(server, 'get', '/auth/demo-accounts')).data.data as { code: string }[]
    expect(demo.map((account) => account.code)).not.toContain('PLN001')

    expect((await act('/PLN001/enable')).status).toBe(200)
    expect((await login('PLN001')).status).toBe(200)
  })

  it('never lets the administrator lock himself out nor leave the park without an admin', async () => {
    expect((await act('/ADM001/disable', { reason: 'Essai' })).status).toBe(422)
    const demoted = await call(server, 'patch', '/settings/user-accounts/ADM001', {
      as: 'ADM001',
      body: { profile: 'MANAGEMENT' }
    })
    expect(demoted.status).toBe(422)
  })

  it('keeps accounts to the administrator', async () => {
    expect((await call(server, 'get', '/settings/user-accounts', { as: 'FLT001' })).status).toBe(
      403
    )
    expect((await act('/PLN001/disable', { reason: 'Essai' }, 'DIR001')).status).toBe(403)
    const rows = (await call(server, 'get', '/settings/user-accounts', { as: 'ADM001' })).data
      .data as { items: UserAccountApi[] }
    expect(rows.items.find((row) => row.no === 'CND009')).toMatchObject({ active: false })
  })
})

describe('activity log', () => {
  it('tells who did what: account changes, sign-ins and the steps of the work orders', async () => {
    await login('FLT001')
    await act('/CND002/disable', { reason: 'Suspension' })
    const page = (
      await call(server, 'get', '/settings/activity-log', {
        as: 'ADM001',
        query: { pageSize: 500 },
        language: 'fr'
      })
    ).data.data as { items: ActivityLogEntryApi[] }
    const actions = page.items.map((row) => `${row.by} ${row.action} ${row.recordNo}`)
    expect(actions).toContain('FLT001 login FLT001')
    expect(actions).toContain('ADM001 account_disabled CND002')
    expect(actions).toContain('ADM001 account_disabled CND009')
    expect(actions).toContain('FLT001 validated OT-2026-0001')
    expect(page.items.find((row) => row.recordNo === 'CND002')).toMatchObject({
      byName: 'Faniry Rakotoarisoa',
      actionLabel: 'Compte désactivé',
      detail: 'Suspension'
    })
    expect((await call(server, 'get', '/settings/activity-log', { as: 'DIR001' })).status).toBe(403)
    const exported = await call(server, 'post', '/settings/activity-log/export', {
      as: 'ADM001',
      body: { columns: [{ field: 'byName', header: 'Auteur' }] }
    })
    expect(exported.status).toBe(200)
  })
})

describe('company', () => {
  it('counts the park from the vehicles and lets only the administrator edit the identity', async () => {
    const company = (await call(server, 'get', '/settings/company', { as: 'ADM001' })).data
      .data as CompanySettingsApi
    const vehicles = server.db.vehicles.all().filter((vehicle) => !vehicle.removal)
    expect(company.vehicleCount).toBe(vehicles.length)
    expect(company.tractorCount + company.trailerCount).toBe(vehicles.length)

    const saved = await call(server, 'patch', '/settings/company', {
      as: 'ADM001',
      body: { taxId: 'NIF 4001234567 / STAT 49291 11 2010' }
    })
    expect(saved.data.data).toMatchObject({ taxId: 'NIF 4001234567 / STAT 49291 11 2010' })
    expect(
      (await call(server, 'patch', '/settings/company', { as: 'ADM001', body: { legalName: ' ' } }))
        .status
    ).toBe(400)
    expect(
      (await call(server, 'patch', '/settings/company', { as: 'FLT001', body: { taxId: 'x' } }))
        .status
    ).toBe(403)
  })
})
