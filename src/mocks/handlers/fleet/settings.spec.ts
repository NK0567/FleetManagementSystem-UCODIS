import { beforeEach, describe, expect, it } from 'vitest'
import type { FleetSettingsApi } from '@/modules/fleet/fleet-settings/types/fleetSettings.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function readSettings(as = 'FLT001') {
  return (await call(server, 'get', '/fleet/settings', { as })).data.data as FleetSettingsApi
}

describe('fleet settings endpoints', () => {
  it('saves one section and records who changed it', async () => {
    const response = await call(server, 'put', '/fleet/settings/geofencing', {
      as: 'FLT001',
      body: { defaultSiteRadiusM: 1500 }
    })
    expect(response.status).toBe(200)
    const settings = response.data.data as FleetSettingsApi
    expect(settings.geofencing.defaultSiteRadiusM).toBe(1500)
    expect(settings.modifiedBy).toBe('FLT001')
    expect(settings.drivingTime.dailyDrivingMaxMin).toBe(600)
  })

  it('refuses a threshold outside its bounds', async () => {
    const response = await call(server, 'put', '/fleet/settings/geofencing', {
      as: 'FLT001',
      body: { defaultSiteRadiusM: 50 }
    })
    expect(response.status).toBe(422)
    expect((await readSettings()).geofencing.defaultSiteRadiusM).toBe(5000)
  })

  it('refuses a night ban with a single bound', async () => {
    const { drivingTime } = await readSettings()
    const response = await call(server, 'put', '/fleet/settings/drivingTime', {
      as: 'ADM001',
      body: { ...drivingTime, nightBanEnd: '' }
    })
    expect(response.status).toBe(422)
  })

  it('answers 404 for an unknown section', async () => {
    const response = await call(server, 'put', '/fleet/settings/weather', {
      as: 'ADM001',
      body: {}
    })
    expect(response.status).toBe(404)
  })

  it('lets management read the settings without changing them', async () => {
    expect((await call(server, 'get', '/fleet/settings', { as: 'DIR001' })).status).toBe(200)
    const response = await call(server, 'put', '/fleet/settings/documents', {
      as: 'DIR001',
      body: { defaultNoticeDays: 45 }
    })
    expect(response.status).toBe(403)
  })
})
