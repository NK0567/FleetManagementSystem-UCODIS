import { beforeEach, describe, expect, it } from 'vitest'
import type { ImportReport } from '@/core/utils/csvImport'
import type { IndicatorSetting } from '@/modules/fleet/fleet-settings/domain/indicators'
import type { FleetSettingsApi } from '@/modules/fleet/fleet-settings/types/fleetSettings.types'
import type { StaffSyncReport } from '@/modules/hr/employees/types/employee.types'
import type {
  ProviderApi,
  ProviderSyncReport
} from '@/modules/fleet/providers/types/provider.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const settings = async (as = 'ADM001') =>
  (await call(server, 'get', '/fleet/settings', { as })).data.data as FleetSettingsApi

const connect = async (values: Record<string, boolean>) =>
  call(server, 'put', '/fleet/settings/integrations', {
    as: 'ADM001',
    body: { hrSystemConnected: false, managementSystemConnected: false, ...values }
  })

describe('import mappings', () => {
  it('keep the heading of the source file for each field, and serve it to whoever imports', async () => {
    const saved = await call(server, 'put', '/fleet/settings/import-mappings/vehicles', {
      as: 'ADM001',
      body: { mapping: { plate: 'N° Immat.', vin: 'Châssis', make: '' } }
    })
    expect(saved.status).toBe(200)
    expect(saved.data.data).toEqual({ plate: 'N° Immat.', vin: 'Châssis' })
    expect(
      (await call(server, 'get', '/fleet/import-mappings/vehicles', { as: 'PLN001' })).data.data
    ).toEqual({
      plate: 'N° Immat.',
      vin: 'Châssis'
    })
    expect((await settings()).importMappings.people).toEqual({})
  })

  it('refuse two fields on one column, an unknown import or field, and a profile without the right', async () => {
    const put = (kind: string, mapping: Record<string, string>, as = 'ADM001') =>
      call(server, 'put', `/fleet/settings/import-mappings/${kind}`, { as, body: { mapping } })
    expect((await put('vehicles', { plate: 'Plaque', vin: 'plaque' })).status).toBe(422)
    expect((await put('vehicles', { colour: 'Couleur' })).status).toBe(422)
    expect((await put('trucks', { plate: 'Plaque' })).status).toBe(404)
    expect((await put('vehicles', { plate: 'Plaque' }, 'DIR001')).status).toBe(403)
  })
})

describe('indicators', () => {
  it('take the codes and labels of the company, with targets shared with the dashboards', async () => {
    const indicators = (await settings()).indicators.map((indicator) =>
      indicator.key === 'availabilityRate'
        ? { ...indicator, code: 'DISPO', label: 'Disponibilité du parc', target: 92 }
        : indicator.key === 'preventiveShare'
          ? { ...indicator, target: 75 }
          : indicator
    )
    const saved = await call(server, 'put', '/fleet/settings/indicators', {
      as: 'ADM001',
      body: { indicators }
    })
    expect(saved.status).toBe(200)
    const after = await settings()
    expect(after.indicators.find((item) => item.key === 'availabilityRate')).toMatchObject({
      code: 'DISPO',
      label: 'Disponibilité du parc',
      target: 92
    })
    expect(after.reporting.availabilityTargetPct).toBe(92)
    expect(
      server.db.maintenanceSettings.findOrFail('MAINTENANCE').targets.preventiveShareTargetPct
    ).toBe(75)
  })

  it('refuse a duplicate code, a target out of bounds and a missing indicator', async () => {
    const base = (await settings()).indicators
    const put = (indicators: IndicatorSetting[]) =>
      call(server, 'put', '/fleet/settings/indicators', { as: 'ADM001', body: { indicators } })
    expect((await put(base.map((item) => ({ ...item, code: 'SAME' })))).status).toBe(422)
    expect(
      (
        await put(
          base.map((item) => (item.key === 'availabilityRate' ? { ...item, target: 140 } : item))
        )
      ).status
    ).toBe(422)
    expect((await put(base.slice(1))).status).toBe(422)
  })
})

describe('people from the HR system', () => {
  const employee = {
    lastName: 'Rasolofo',
    firstName: 'Nirina',
    jobPositionNo: 'Conducteur',
    orgUnitNo: 'CND',
    categoryNo: 'CAT-C',
    siteCode: 'DEP-TNJ',
    phone: '034 12 350 01',
    nationalId: '101 234 600 001',
    contractType: 'permanent',
    hireDate: '2026-11-02'
  }

  it('are imported by file while there is no HR system, a known identity being refused', async () => {
    const response = await call(server, 'post', '/hr/employees/import', {
      as: 'FLT001',
      body: { rows: [employee, { ...employee, phone: '034 00 000 00' }] }
    })
    const report = response.data.data as ImportReport
    expect(report).toMatchObject({ created: 1, rejected: 1 })
    expect(server.db.employees.find(report.results[0]!.no!)).toMatchObject({ jobPositionNo: 'CND' })
    expect((await call(server, 'post', '/hr/employees/sync', { as: 'FLT001' })).status).toBe(409)
  })

  it('are synchronized once the HR system is declared, and no longer typed in', async () => {
    expect((await connect({ hrSystemConnected: true })).status).toBe(200)
    const sync = await call(server, 'post', '/hr/employees/sync', { as: 'FLT001' })
    const report = sync.data.data as StaffSyncReport
    expect(report.created).toHaveLength(2)
    expect(report.updated).toEqual(['UCT-001'])
    expect(server.db.employees.findOrFail('UCT-001').phone).toBe('034 12 345 91')
    const again = (await call(server, 'post', '/hr/employees/sync', { as: 'FLT001' })).data
      .data as StaffSyncReport
    expect(again).toMatchObject({ created: [], updated: [], unchanged: 3 })
    expect(
      (await call(server, 'post', '/hr/employees', { as: 'FLT001', body: employee })).status
    ).toBe(409)
    expect(
      (
        await call(server, 'post', '/hr/employees/import', {
          as: 'FLT001',
          body: { rows: [employee] }
        })
      ).status
    ).toBe(409)
    expect((await call(server, 'post', '/hr/employees/sync', { as: 'PLN001' })).status).toBe(403)
  })
})

describe('providers from the management system', () => {
  it('are taken once it is declared: created, updated, and blocked ones not authorized', async () => {
    expect((await call(server, 'post', '/fleet/providers/sync', { as: 'FLT001' })).status).toBe(409)
    await connect({ managementSystemConnected: true })
    const report = (await call(server, 'post', '/fleet/providers/sync', { as: 'FLT001' })).data
      .data as ProviderSyncReport
    expect(report.updated).toEqual(['PRS-001'])
    expect(report.created).toHaveLength(2)
    const providers = (
      await call(server, 'get', '/fleet/providers', { as: 'FLT001', query: { pageSize: 200 } })
    ).data.data as { items: ProviderApi[] }
    const insurer = providers.items.find((row) => row.externalId === 'ERP-F-0057')
    expect(insurer).toMatchObject({ source: 'management_system', authorized: false })
    expect(providers.items.find((row) => row.no === 'PRS-001')?.providerTypeName).toBe('Atelier')
  })
})

describe('provider types', () => {
  it('are set up by the administrator; the types the application uses stay', async () => {
    const created = await call(server, 'post', '/fleet/provider-types', {
      as: 'ADM001',
      body: { no: 'EXPERT', name: 'Expert automobile', active: true }
    })
    expect(created.status).toBe(201)
    const provider = await call(server, 'post', '/fleet/providers', {
      as: 'FLT001',
      body: { name: 'Cabinet Expertise Auto', providerType: 'EXPERT' }
    })
    expect(provider.status).toBe(201)
    expect((provider.data.data as ProviderApi).providerTypeName).toBe('Expert automobile')
    expect(
      (await call(server, 'delete', '/fleet/provider-types/EXPERT', { as: 'ADM001' })).status
    ).toBe(409)
    expect(
      (await call(server, 'delete', '/fleet/provider-types/garage', { as: 'ADM001' })).status
    ).toBe(409)
    await call(server, 'patch', '/fleet/provider-types/EXPERT', {
      as: 'ADM001',
      body: { active: false }
    })
    expect(
      (
        await call(server, 'post', '/fleet/providers', {
          as: 'FLT001',
          body: { name: 'Autre cabinet', providerType: 'EXPERT' }
        })
      ).status
    ).toBe(422)
    expect(
      (
        await call(server, 'post', '/fleet/provider-types', {
          as: 'PLN001',
          body: { no: 'X', name: 'X' }
        })
      ).status
    ).toBe(403)
  })
})
