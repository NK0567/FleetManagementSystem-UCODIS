import { beforeEach, describe, expect, it } from 'vitest'
import type { ProviderApi } from '@/modules/fleet/providers/types/provider.types'
import type { SiteApi } from '@/modules/fleet/sites/types/site.types'
import type { SiteTypeApi } from '@/modules/fleet/site-types/types/siteType.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const newSite = {
  no: 'PRK-IVT',
  name: 'Parking Ivato',
  siteTypeNo: 'PARKING',
  latitude: -18.8,
  longitude: 47.48
}

describe('vehicle types', () => {
  it('refuses a motorized type towed by a tractor', async () => {
    const response = await call(server, 'post', '/fleet/vehicle-types', {
      as: 'FLT001',
      body: { no: 'VAN', name: 'Fourgon', motorized: true, couplingRole: 'towed' }
    })
    expect(response.status).toBe(422)
  })

  it('checks the type as a whole when a single property changes', async () => {
    const response = await call(server, 'patch', '/fleet/vehicle-types/SEMI-TRAILER', {
      as: 'FLT001',
      body: { carriesGoods: false, hasCompartments: true }
    })
    expect(response.status).toBe(422)
  })
})

describe('sites and site types', () => {
  it('applies the radius of the site type when the site sets none', async () => {
    const sites = (
      await call(server, 'get', '/fleet/sites', { as: 'FLT001', query: { pageSize: 50 } })
    ).data.data as { items: SiteApi[] }
    const relay = sites.items.find((site) => site.no === 'REL-MOR')
    expect(relay).toMatchObject({ radiusM: null, siteTypeName: 'Relais', effectiveRadiusM: 1000 })
  })

  it('creates a site with an upper-case code and refuses a second site with the same name', async () => {
    const created = await call(server, 'post', '/fleet/sites', {
      as: 'FLT001',
      body: { ...newSite, no: 'prk-ivt' }
    })
    expect(created.status).toBe(201)
    expect((created.data.data as SiteApi).no).toBe('PRK-IVT')

    const twin = await call(server, 'post', '/fleet/sites', {
      as: 'FLT001',
      body: { ...newSite, no: 'PRK-2', name: 'parking ivato' }
    })
    expect(twin.status).toBe(409)
  })

  it('refuses coordinates outside the globe', async () => {
    const response = await call(server, 'post', '/fleet/sites', {
      as: 'FLT001',
      body: { ...newSite, latitude: 120 }
    })
    expect(response.status).toBe(400)
  })

  it('keeps a site used by employees and a type used by sites', async () => {
    expect((await call(server, 'delete', '/fleet/sites/HQ-TNR', { as: 'FLT001' })).status).toBe(409)
    expect((await call(server, 'delete', '/fleet/site-types/RELAY', { as: 'FLT001' })).status).toBe(
      409
    )
    const types = (await call(server, 'get', '/fleet/site-types', { as: 'FLT001' })).data.data as {
      items: SiteTypeApi[]
    }
    expect(types.items.find((type) => type.no === 'CHECKPOINT')?.siteCount).toBe(4)
  })

  it('lets employees reference a fleet site', async () => {
    const response = await call(server, 'patch', '/hr/employees/UCT-001', {
      as: 'ADM001',
      body: { siteCode: 'NOWHERE' }
    })
    expect(response.status).toBe(400)
  })
})

describe('providers', () => {
  it('numbers the provider and its new contracts', async () => {
    const response = await call(server, 'post', '/fleet/providers', {
      as: 'FLT001',
      body: {
        name: 'Garage du Sud',
        providerType: 'garage',
        contracts: [{ subject: 'Entretien', startDate: '2026-01-01', endDate: null, amount: 1000 }]
      }
    })
    expect(response.status).toBe(201)
    const provider = response.data.data as ProviderApi
    expect(provider.no).toBe('PRS-018')
    expect(provider.contracts[0]?.reference).toBe('CTR-003')
    expect(provider.activeContractCount).toBe(1)
  })

  it('refuses a contract that ends before it starts', async () => {
    const response = await call(server, 'patch', '/fleet/providers/PRS-001', {
      as: 'FLT001',
      body: {
        contracts: [{ subject: 'Entretien', startDate: '2026-02-01', endDate: '2026-01-01' }]
      }
    })
    expect(response.status).toBe(422)
  })

  it('requires a reason to withdraw a provider and drops it once authorized again', async () => {
    const withdrawn = await call(server, 'patch', '/fleet/providers/PRS-001', {
      as: 'FLT001',
      body: { authorized: false }
    })
    expect(withdrawn.status).toBe(422)

    const restored = await call(server, 'patch', '/fleet/providers/PRS-003', {
      as: 'FLT001',
      body: { authorized: true }
    })
    expect((restored.data.data as ProviderApi).notAuthorizedReason).toBe('')
  })

  it('refuses two providers of the same type with the same name', async () => {
    const response = await call(server, 'post', '/fleet/providers', {
      as: 'FLT001',
      body: { name: 'aro madagascar', providerType: 'insurer' }
    })
    expect(response.status).toBe(409)
  })

  it('leaves the reference data read-only for management', async () => {
    const response = await call(server, 'post', '/fleet/vehicle-types', {
      as: 'DIR001',
      body: { no: 'BUS', name: 'Bus', motorized: true, couplingRole: 'none' }
    })
    expect(response.status).toBe(403)
  })
})
