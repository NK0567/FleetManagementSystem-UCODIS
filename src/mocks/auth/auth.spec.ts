import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../testing'
import type { MockServer } from '../index'
import { disabledFeatures, permissionsFor } from './permissions'
import type { UserPermissionRow } from '@/types/auth.types'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

function permission(rows: UserPermissionRow[], feature: string) {
  return rows.find((row) => row.feature === feature)
}

describe('auth endpoints', () => {
  it('logs in with the demo password and returns a token and the profile', async () => {
    const response = await call(server, 'post', '/auth/login', {
      body: { userCode: 'flt001', userPassword: 'demo' }
    })

    expect(response.status).toBe(200)
    expect(response.data.data).toMatchObject({
      accessToken: 'mock.FLT001',
      user: { code: 'FLT001', profile: 'FLEET_MANAGER', landingRoute: '/hr' }
    })
  })

  it('refuses a wrong password with 401 and a suspended account with 403', async () => {
    const wrong = await call(server, 'post', '/auth/login', {
      body: { userCode: 'FLT001', userPassword: 'nope' },
      language: 'fr'
    })
    expect(wrong.status).toBe(401)
    expect(wrong.data.message).toBe('Code utilisateur ou mot de passe incorrect.')

    const suspended = await call(server, 'post', '/auth/login', {
      body: { userCode: 'CND009', userPassword: 'demo' }
    })
    expect(suspended.status).toBe(403)
  })

  it('serves the profile and permissions of the session user only', async () => {
    expect((await call(server, 'get', '/auth/profile')).status).toBe(401)

    const profile = await call(server, 'get', '/auth/profile', { as: 'DIR001' })
    expect(profile.data.data).toMatchObject({ code: 'DIR001', profile: 'MANAGEMENT' })

    const permissions = await call(server, 'get', '/auth/permissions', { as: 'DIR001' })
    const leave = permission(permissions.data.data as UserPermissionRow[], 'LEAVEREQUEST')
    expect(leave).toMatchObject({ read: true, export: true, execute: false, insert: false })
  })

  it('lists active demo accounts without a session', async () => {
    const response = await call(server, 'get', '/auth/demo-accounts')
    const codes = (response.data.data as { code: string }[]).map((account) => account.code)

    expect(codes).toContain('ADM001')
    expect(codes).not.toContain('CND009')
    expect(response.data.data).toContainEqual(
      expect.objectContaining({ code: 'ADM001', password: 'demo' })
    )
  })
})

describe('role permissions', () => {
  it('lets only the administrator and the fleet manager decide on leave requests', () => {
    const deciders = (['ADMIN', 'FLEET_MANAGER', 'MANAGEMENT', 'DEPOT', 'DRIVER'] as const).filter(
      (profile) => permission(permissionsFor(profile), 'LEAVEREQUEST')?.execute
    )
    expect(deciders).toEqual(['ADMIN', 'FLEET_MANAGER'])
  })

  it('never lets anyone delete an employee', () => {
    expect(permission(permissionsFor('ADMIN'), 'EMPLOYEE')?.delete).toBe(false)
  })

  it('gives field profiles their own space and their own leave, nothing else in HR', () => {
    expect(permission(permissionsFor('DRIVER'), 'MYSPACE')?.execute).toBe(true)
    expect(permission(permissionsFor('DRIVER_ASSISTANT'), 'MYSPACE')?.execute).toBe(false)
    expect(permission(permissionsFor('DRIVER'), 'LEAVEREQUEST')?.insert).toBe(true)
    expect(permission(permissionsFor('DRIVER'), 'LEAVEREQUEST')?.execute).toBe(false)
    expect(permission(permissionsFor('DRIVER'), 'EMPLOYEE')).toBeUndefined()
  })

  it('removes the features of a disabled module toggle', () => {
    const disabled = disabledFeatures([
      { no: 'trips', active: false, createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '' }
    ])
    expect([...disabled]).toEqual(['TRIP', 'ROUTETEMPLATE'])
  })
})
