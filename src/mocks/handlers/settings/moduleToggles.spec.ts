import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import { disabledFeatures } from '../../auth/permissions'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

describe('module toggle endpoints', () => {
  it('lists every module with its group and features, active by default', async () => {
    const response = await call(server, 'get', '/settings/module-toggles', {
      as: 'ADM001',
      query: { pageSize: 100, sortBy: 'order' }
    })
    const items = (
      response.data.data as { items: { no: string; active: boolean; group: string }[] }
    ).items

    expect(items).toHaveLength(19)
    expect(items[0]).toMatchObject({ no: 'live-map', group: 'fleet', active: true })
    expect(items.every((item) => item.active)).toBe(true)
  })

  it('lets the administrator disable a module, which disables its features', async () => {
    const response = await call(server, 'patch', '/settings/module-toggles/trips', {
      as: 'ADM001',
      body: { active: false }
    })

    expect(response.status).toBe(200)
    expect(response.data.data).toMatchObject({ no: 'trips', active: false, modifiedBy: 'ADM001' })
    expect([...disabledFeatures(server.db.moduleToggles.all())]).toEqual(['TRIP', 'ROUTETEMPLATE'])
  })

  it('rejects a missing active flag', async () => {
    const response = await call(server, 'patch', '/settings/module-toggles/trips', {
      as: 'ADM001',
      body: { active: 'no' }
    })
    expect(response.status).toBe(400)
  })

  it('refuses other profiles, even management', async () => {
    const response = await call(server, 'patch', '/settings/module-toggles/trips', {
      as: 'DIR001',
      body: { active: false }
    })
    expect(response.status).toBe(403)
  })
})
