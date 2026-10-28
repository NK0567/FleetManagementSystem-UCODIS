import { beforeEach, describe, expect, it } from 'vitest'
import type { MaintenanceSettingsApi } from '@/modules/maintenance/maintenance-settings/types/maintenanceSettings.types'
import type { TechnicianApi } from '@/modules/maintenance/technicians/types/technician.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const send = (
  method: 'post' | 'patch' | 'put' | 'delete',
  path: string,
  body = {},
  as = 'FLT001'
) => call(server, method, path, { as, body, language: 'en' })

describe('maintenance settings', () => {
  it('are saved one section at a time, within bounds, by the fleet manager only', async () => {
    const settings = (await call(server, 'get', '/maintenance/settings', { as: 'MNT001' })).data
      .data as MaintenanceSettingsApi
    expect(settings.service).toMatchObject({ toleranceKm: 500, toleranceDays: 7 })
    const workshop = { stations: 3, hoursPerDay: 9, workingDaysPerWeek: 6 }
    expect((await send('put', '/maintenance/settings/workshop', workshop, 'MNT001')).status).toBe(
      403
    )
    expect(
      (await send('put', '/maintenance/settings/workshop', { ...workshop, hoursPerDay: 30 })).status
    ).toBe(422)
    const saved = await send('put', '/maintenance/settings/workshop', workshop)
    expect((saved.data.data as MaintenanceSettingsApi).workshop).toEqual(workshop)
    expect((await send('put', '/maintenance/settings/weather', workshop)).status).toBe(404)
  })
})

describe('maintenance references', () => {
  it('name technicians after their HR record and check their skills', async () => {
    const { items: technicians } = (
      await call(server, 'get', '/maintenance/technicians', {
        as: 'MNT001',
        query: { pageSize: 50 }
      })
    ).data.data as { items: TechnicianApi[] }
    expect(technicians.find((technician) => technician.no === 'UCT-003')).toMatchObject({
      fullName: 'Tojo Rasoanaivo',
      jobPositionName: 'Technicien de maintenance',
      competenceNames: 'Mécanique, Pneumatique'
    })
    const candidate = { no: 'UCT-001', competences: ['ELECTRICAL'] }
    expect(
      (await send('post', '/maintenance/technicians', { ...candidate, competences: [] })).status
    ).toBe(422)
    expect(
      (await send('post', '/maintenance/technicians', { ...candidate, competences: ['WELDING'] }))
        .status
    ).toBe(422)
    await send(
      'post',
      '/hr/employees/UCT-001/archive',
      { reason: 'Départ de l’entreprise.' },
      'ADM001'
    )
    expect((await send('post', '/maintenance/technicians', candidate)).status).toBe(422)
    expect(
      (await send('post', '/maintenance/technicians', { ...candidate, no: 'UCT-002' })).status
    ).toBe(201)
  })

  it('hang only subsystems under a system, with the skill that repairs them', async () => {
    const code = { no: 'GEARBOX', name: 'Boîte de vitesses', kind: 'subsystem' }
    expect((await send('post', '/maintenance/failure-codes', code)).status).toBe(422)
    expect(
      (
        await send('post', '/maintenance/failure-codes', {
          ...code,
          parentNo: 'LEAK',
          competenceNo: 'MECHANICAL'
        })
      ).status
    ).toBe(422)
    expect(
      (
        await send('post', '/maintenance/failure-codes', {
          ...code,
          kind: 'mode',
          parentNo: 'POWERTRAIN'
        })
      ).status
    ).toBe(422)
    expect(
      (
        await send('post', '/maintenance/failure-codes', {
          ...code,
          parentNo: 'POWERTRAIN',
          competenceNo: 'MECHANICAL'
        })
      ).status
    ).toBe(201)
    expect((await send('delete', '/maintenance/failure-codes/POWERTRAIN')).status).toBe(409)
    expect((await send('delete', '/maintenance/competences/MECHANICAL')).status).toBe(409)
  })

  it('give each automatic downtime role to one cause only', async () => {
    const cause = {
      no: 'PNX',
      name: 'Panne électrique',
      family: 'technical',
      systemRole: 'breakdown'
    }
    expect((await send('post', '/maintenance/downtime-codes', cause)).status).toBe(409)
    expect(
      (await send('post', '/maintenance/downtime-codes', { ...cause, systemRole: null })).status
    ).toBe(201)
    expect((await send('delete', '/maintenance/downtime-codes/PNN')).status).toBe(409)
    expect((await send('delete', '/maintenance/downtime-codes/ATP')).status).toBe(200)
  })

  it('stay read-only for the maintenance technician', async () => {
    const type = { no: 'TOWING', name: 'Remorquage', isControl: false }
    expect((await send('post', '/maintenance/mission-types', type, 'MNT001')).status).toBe(403)
    expect((await send('post', '/maintenance/mission-types', type)).status).toBe(201)
  })
})
