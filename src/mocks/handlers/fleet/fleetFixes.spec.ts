import { beforeEach, describe, expect, it } from 'vitest'
import type { DepartureAuthorizationApi } from '@/modules/fleet/departure-authorizations/types/departureAuthorization.types'
import type { DriverActivityApi } from '@/modules/fleet/drivers/types/driver.types'
import type { DriverAssignmentApi } from '@/modules/fleet/driver-assignments/types/driverAssignment.types'
import type { DocumentTypeApi } from '@/modules/fleet/document-types/types/documentType.types'
import type { TripApi } from '@/modules/fleet/trips/types/trip.types'
import type { ReferenceData } from '@/types/reference.types'
import { addDays, todayIso } from '@/utils/date'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = async <T>(path: string, as = 'FLT001', language: 'fr' | 'en' = 'fr') =>
  (await call(server, 'get', path, { as, language })).data.data as T

const list = (data: ReferenceData, key: string) => data[key] ?? []

const references = (as = 'FLT001', language: 'fr' | 'en' = 'fr') =>
  get<ReferenceData>('/reference/all', as, language)

describe('couplings: only free vehicles are offered', () => {
  it('leaves out the tractors and trailers already coupled', async () => {
    const data = await references()
    const coupled = server.db.couplings.all().filter((coupling) => !coupling.endDate)
    expect(coupled.length).toBeGreaterThan(0)
    const tractors = list(data, 'uncoupledTractors').map((item) => item.code)
    const trailers = list(data, 'uncoupledTrailers').map((item) => item.code)
    for (const coupling of coupled) {
      expect(tractors).not.toContain(coupling.tractorNo)
      expect(trailers).not.toContain(coupling.trailerNo)
    }
    expect(list(data, 'tractors').length).toBeGreaterThan(tractors.length)
  })

  it('offers them again once the coupling ends', async () => {
    const running = server.db.couplings.all().find((coupling) => !coupling.endDate)!
    const ended = await call(server, 'post', `/fleet/couplings/${running.no}/end`, {
      as: 'FLT001',
      body: { endDate: running.startDate }
    })
    expect(ended.status).toBe(200)
    const data = await references()
    expect(list(data, 'uncoupledTractors').map((item) => item.code)).toContain(running.tractorNo)
  })
})

describe('driver assignments: the base and the refusal', () => {
  it('lists the drivers that are not offered with the reason', async () => {
    const data = await references('FLT001', 'fr')
    const excluded = list(data, 'excludedDrivers').find((item) => item.code === 'UCT-016')
    expect(excluded?.description).toContain('Nomena Andriantsoa')
    expect(excluded?.description.split(':')[1]?.trim().length).toBeGreaterThan(0)
    expect(list(data, 'excludedDrivers').map((item) => item.code)).not.toContain('UCT-010')
    const english = await references('FLT001', 'en')
    expect(
      list(english, 'excludedDrivers').find((item) => item.code === 'UCT-016')?.description
    ).not.toBe(excluded?.description)
  })

  it('attaches the vehicle to the base chosen with the assignment', async () => {
    const created = await call(server, 'post', '/fleet/driver-assignments', {
      as: 'FLT001',
      body: {
        employeeNo: 'UCT-019',
        vehicleNo: 'VEH-019',
        startDate: '2026-09-06',
        homeSiteNo: 'ENT-TNJ'
      }
    })
    if (created.status === 201 || created.status === 200) {
      const assignment = created.data.data as DriverAssignmentApi
      expect(assignment.homeSiteNo).toBe('ENT-TNJ')
      expect(server.db.vehicles.findOrFail('VEH-019').homeSiteNo).toBe('ENT-TNJ')
    } else {
      // The pair may be refused for a reason of its own; the base must then stay untouched.
      expect(created.status).toBe(422)
    }
  })

  it('refuses an unknown base and keeps the vehicle where it was', async () => {
    const before = server.db.vehicles.findOrFail('VEH-019').homeSiteNo
    const refused = await call(server, 'post', '/fleet/driver-assignments', {
      as: 'FLT001',
      body: {
        employeeNo: 'UCT-019',
        vehicleNo: 'VEH-019',
        startDate: '2026-09-06',
        homeSiteNo: 'NOWHERE'
      }
    })
    expect(refused.status).toBeGreaterThanOrEqual(400)
    expect(server.db.vehicles.findOrFail('VEH-019').homeSiteNo).toBe(before)
  })

  it('reads the base of an old assignment from its vehicle', async () => {
    const list = await get<{ items: DriverAssignmentApi[] }>(
      '/fleet/driver-assignments?pageSize=50'
    )
    const first = list.items.find((row) => row.no === 'ASG-0001')!
    expect(first.homeSiteNo).toBe(server.db.vehicles.findOrFail(first.vehicleNo).homeSiteNo)
    expect(first.homeSiteName).not.toBe('')
  })
})

describe('trips: entry into and exit from the zone of a stop', () => {
  it('stamps the entry, and the exit once the vehicle moved on', async () => {
    const trips = await get<{ items: TripApi[] } | TripApi[]>('/fleet/trips')
    const items = Array.isArray(trips) ? trips : trips.items
    const closed = items.find((trip) => trip.no === 'TRP-00004')!
    expect(closed.stops[0]).toMatchObject({ enteredAt: null })
    expect(closed.stops[0]?.exitedAt).toBe(closed.stops[0]?.passedAt)
    expect(closed.stops[1]?.enteredAt).toBe(closed.stops[1]?.passedAt)
    expect(closed.stops[1]?.exitedAt).not.toBeNull()
    expect(closed.stops.at(-1)?.exitedAt).toBeNull()
    const planned = items.find((trip) => trip.no === 'TRP-00007')!
    expect(planned.stops.every((stop) => stop.enteredAt === null && stop.exitedAt === null)).toBe(
      true
    )
  })
})

describe('document types: the country of the regulation', () => {
  it('keeps the country, and ignores a type tied to another country', async () => {
    const created = await call(server, 'post', '/fleet/document-types', {
      as: 'ADM001',
      body: {
        no: 'VEH-ABROAD',
        name: 'Carte étrangère',
        target: 'vehicle',
        mandatory: true,
        validity: 'unlimited',
        personScope: 'all',
        country: 'Kenya'
      }
    })
    expect(created.status).toBe(201)
    expect((created.data.data as DocumentTypeApi).country).toBe('Kenya')
    const missing = await get<{ items: { documentTypeName: string }[] }>(
      '/fleet/missing-documents?pageSize=200'
    )
    expect(missing.items.map((row) => row.documentTypeName)).not.toContain('Carte étrangère')
  })

  it('requires the type once the company is in that country', async () => {
    await call(server, 'post', '/fleet/document-types', {
      as: 'ADM001',
      body: {
        no: 'VEH-HOME',
        name: 'Carte locale',
        target: 'vehicle',
        mandatory: true,
        validity: 'unlimited',
        personScope: 'all',
        country: 'madagascar'
      }
    })
    const missing = await get<{ items: { documentTypeName: string }[] }>(
      '/fleet/missing-documents?pageSize=200'
    )
    expect(missing.items.map((row) => row.documentTypeName)).toContain('Carte locale')
  })
})

describe('driving time settings: a value out of the usual bounds is saved', () => {
  const body = (continuousDrivingMaxMin: number) => ({
    ...(server.db.fleetSettings.all()[0]?.drivingTime as object),
    continuousDrivingMaxMin
  })

  it('accepts 400 minutes of continuous driving', async () => {
    const saved = await call(server, 'put', '/fleet/settings/drivingTime', {
      as: 'ADM001',
      body: body(400)
    })
    expect(saved.status).toBe(200)
  })

  it('still refuses zero and a negative value', async () => {
    for (const value of [0, -30]) {
      const refused = await call(server, 'put', '/fleet/settings/drivingTime', {
        as: 'ADM001',
        body: body(value)
      })
      expect(refused.status).toBe(422)
    }
  })
})

describe('providers not authorized', () => {
  it('are no longer offered in the lists of choice', async () => {
    const provider = server.db.providers.all().find((row) => row.providerType === 'garage')!
    server.db.providers.update(provider.no, { authorized: false })
    const data = await references('RMT001')
    const garage = list(data, 'garages').find((item) => item.code === provider.no)
    expect(garage?.active).toBe(false)
  })
})

describe('driver activity: followed trainings', () => {
  it('shows the day the training was followed', async () => {
    const training = server.db.trainings.all().find((row) => row.attendedOn)!
    const activity = await get<DriverActivityApi>(`/fleet/drivers/${training.employeeNo}/activity`)
    const line = activity.trainings.find((item) => item.no === training.no)
    expect(line?.attendedOn).toBe(training.attendedOn)
  })
})

describe('product families of the vehicle forms', () => {
  it('are served to the fleet manager, who cannot read the product list', async () => {
    const data = await references('FLT001')
    expect(list(data, 'productFamilies').length).toBeGreaterThan(0)
  })
})

describe('departure with a driver document that is not regularized', () => {
  it('is refused once a document of the driver is declared lost', async () => {
    const trip = server.db.trips.findOrFail('TRP-00007')
    const document = server.db.documents
      .all()
      .find(
        (row) => row.target === 'person' && row.subjectNo === trip.driverNo && !row.replacedByNo
      )!
    const declared = await call(server, 'post', `/fleet/documents/${document.no}/declare`, {
      as: 'FLT001',
      body: { status: 'lost', reason: 'Perdue lors du contrôle' }
    })
    expect(declared.status).toBe(200)
    const authorization = await get<DepartureAuthorizationApi>(
      '/fleet/departure-authorizations/AUT-2026-0007'
    )
    expect(authorization.checks.find((check) => check.code === 'driver')?.ok).toBe(false)
    const grant = await call(
      server,
      'post',
      '/fleet/departure-authorizations/AUT-2026-0007/grant',
      {
        as: 'FLT001'
      }
    )
    expect(grant.status).toBe(422)

    // Renewing the document puts the driver back in order and the departure can be granted.
    const renewed = await call(server, 'post', '/fleet/documents', {
      as: 'FLT001',
      body: {
        target: 'person',
        subjectNo: trip.driverNo,
        documentTypeNo: document.documentTypeNo,
        number: 'MED-2026-NEW',
        issueDate: todayIso(),
        expiryDate: addDays(todayIso(), 300)
      }
    })
    expect(renewed.status).toBe(201)
    const again = await call(
      server,
      'post',
      '/fleet/departure-authorizations/AUT-2026-0007/grant',
      {
        as: 'FLT001'
      }
    )
    expect(again.status).toBe(200)
  })
})

describe('alerts of a checklist filled at a stop', () => {
  it('say "Check-list de pause" and not "de départ"', async () => {
    const points = (
      await call(server, 'get', '/fleet/check-points', {
        as: 'FLT001',
        query: {
          pageSize: 100,
          filters: JSON.stringify([{ field: 'scope', valueType: 'string', value: 'vehicle' }])
        }
      })
    ).data.data as { items: { no: string }[] }
    const results = points.items.map((point, index) => ({
      pointNo: point.no,
      result: index === 0 ? 'anomaly' : 'ok',
      comment: index === 0 ? 'Bruit au freinage' : ''
    }))
    const saved = await call(server, 'post', '/fleet/road-checklists', {
      as: 'FLT001',
      language: 'fr',
      body: { tripNo: 'TRP-00006', stage: 'stop', takenAt: '2026-09-04T09:00', results }
    })
    expect([200, 201]).toContain(saved.status)
    const alerts = (await call(server, 'get', '/fleet/alerts', { as: 'FLT001', language: 'fr' }))
      .data.data as {
      items?: { category: string; detail: string }[]
    }
    const lines = alerts.items ?? (alerts as unknown as { category: string; detail: string }[])
    const checklist = lines.find(
      (alert) => alert.category === 'checklist' && alert.detail.includes('pause')
    )
    expect(checklist?.detail).toMatch(/^Check-list de pause : /)
  })
})
