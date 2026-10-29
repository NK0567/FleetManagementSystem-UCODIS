import { beforeEach, describe, expect, it } from 'vitest'
import type { DriverApi } from '@/modules/fleet/drivers/types/driver.types'
import type {
  DocumentApi,
  MissingDocumentApi
} from '@/modules/fleet/documents/types/document.types'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function get<T>(path: string, query: Record<string, unknown> = {}) {
  return (await call(server, 'get', path, { as: 'FLT001', query })).data.data as T
}

async function documentsOf(subjectNo: string, documentTypeNo: string) {
  const page = await get<{ items: DocumentApi[] }>('/fleet/documents', {
    pageSize: 50,
    filters: JSON.stringify([
      { field: 'subjectNo', valueType: 'string', value: subjectNo },
      { field: 'documentTypeNo', valueType: 'string', value: documentTypeNo }
    ])
  })
  return page.items
}

async function missing() {
  return (await get<{ items: MissingDocumentApi[] }>('/fleet/missing-documents', { pageSize: 200 }))
    .items
}

const create = (body: Record<string, unknown>) =>
  call(server, 'post', '/fleet/documents', { as: 'FLT001', body })

const inspection = {
  target: 'vehicle',
  subjectNo: 'VEH-005',
  documentTypeNo: 'VEH-INSP',
  number: 'VT-2026-118',
  issueDate: '2026-09-04',
  expiryDate: '2027-03-03'
}

describe('document state', () => {
  it('derives the state from the end date and the notice', async () => {
    const [insurance] = await documentsOf('VEH-008', 'VEH-INS')
    expect(insurance).toMatchObject({ state: 'expiring', current: true })
    const [expired] = await documentsOf('VEH-005', 'VEH-INSP')
    expect(expired?.state).toBe('expired')
  })
})

describe('renewal', () => {
  it('replaces the current document and keeps the old one in the history', async () => {
    const before = await documentsOf('VEH-005', 'VEH-INSP')
    const response = await create(inspection)
    expect(response.status).toBe(201)
    const renewed = response.data.data as DocumentApi
    expect(renewed).toMatchObject({ version: 2, state: 'valid', current: true })

    const history = await documentsOf('VEH-005', 'VEH-INSP')
    expect(history).toHaveLength(before.length + 1)
    expect(history.find((row) => row.no === before[0]?.no)).toMatchObject({
      replacedByNo: renewed.no,
      current: false
    })
  })

  it('freezes a replaced document', async () => {
    const [previous] = await documentsOf('VEH-005', 'VEH-INSP')
    await create(inspection)
    const edit = await call(server, 'patch', `/fleet/documents/${previous?.no}`, {
      as: 'FLT001',
      body: { number: 'X' }
    })
    expect(edit.status).toBe(409)
  })

  it('checks the dates and the type against the holder', async () => {
    expect((await create({ ...inspection, expiryDate: null })).status).toBe(422)
    expect((await create({ ...inspection, expiryDate: '2026-01-01' })).status).toBe(422)
    expect((await create({ ...inspection, issueDate: '2030-01-01' })).status).toBe(422)
    expect((await create({ ...inspection, documentTypeNo: 'PER-LIC' })).status).toBe(422)
    // The tax disc only concerns tractors.
    expect(
      (await create({ ...inspection, subjectNo: 'VEH-019', documentTypeNo: 'VEH-TAX' })).status
    ).toBe(422)
  })
})

describe('compliance', () => {
  it('immobilizes a vehicle whose mandatory document expired, until it is renewed', async () => {
    expect(await get<VehicleApi>('/fleet/vehicles/VEH-005')).toMatchObject({
      status: 'immobilized',
      documentsCompliant: false
    })
    await create(inspection)
    const vehicle = await get<VehicleApi>('/fleet/vehicles/VEH-005')
    expect(vehicle.status).not.toBe('immobilized')
    expect(vehicle.documentsCompliant).toBe(true)
  })

  it('does not immobilize a vehicle for a document never recorded', async () => {
    expect(await get<VehicleApi>('/fleet/vehicles/VEH-019')).toMatchObject({
      status: 'available',
      documentsCompliant: false
    })
  })

  it('makes a driver with an expired medical check ineligible', async () => {
    expect(await get<DriverApi>('/fleet/drivers/UCT-022')).toMatchObject({
      documentsCompliant: false,
      documentGaps: 'Visite médicale (Expired)'
    })
    const assignment = await call(server, 'post', '/fleet/driver-assignments', {
      as: 'FLT001',
      body: { employeeNo: 'UCT-022', vehicleNo: 'VEH-007', startDate: '2026-09-04' }
    })
    expect(assignment.status).toBe(422)
    expect(assignment.data.message).toContain('documents')
  })

  it('lists what is missing and drops a gap once the document exists', async () => {
    const gaps = await missing()
    expect(gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subjectNo: 'VEH-019',
          documentTypeNo: 'VEH-REG',
          reason: 'missing'
        }),
        expect.objectContaining({
          subjectNo: 'VEH-024',
          documentTypeNo: 'VEH-REG',
          reason: 'lost'
        }),
        expect.objectContaining({
          subjectNo: 'UCT-022',
          documentTypeNo: 'PER-MED',
          reason: 'expired'
        })
      ])
    )
    await create(inspection)
    expect(
      (await missing()).some(
        (gap) => gap.subjectNo === 'VEH-005' && gap.documentTypeNo === 'VEH-INSP'
      )
    ).toBe(false)
  })
})

describe('declaring a document cancelled or lost', () => {
  it('needs a reason and turns the document into a gap', async () => {
    const [insurance] = await documentsOf('VEH-008', 'VEH-INS')
    const declare = (body: Record<string, unknown>) =>
      call(server, 'post', `/fleet/documents/${insurance?.no}/declare`, { as: 'FLT001', body })
    expect((await declare({ status: 'lost' })).status).toBe(422)
    expect(
      (await declare({ status: 'lost', reason: 'Perdue lors du contrôle' })).data.data
    ).toMatchObject({
      state: 'lost',
      declaredBy: 'FLT001'
    })
    expect((await declare({ status: 'cancelled', reason: 'Encore' })).status).toBe(409)
    // VEH-008 is also at the workshop: it shows in maintenance, and its documents keep it out.
    const vehicle = await get<VehicleApi>('/fleet/vehicles/VEH-008')
    expect(vehicle.status).toBe('in_maintenance')
    expect(vehicle.documentsCompliant).toBe(false)
  })
})

describe('document types', () => {
  it('cannot be deleted while documents use them', async () => {
    const response = await call(server, 'delete', '/fleet/document-types/VEH-INS', { as: 'FLT001' })
    expect(response.status).toBe(409)
  })

  it('only accepts known vehicle types', async () => {
    const response = await call(server, 'patch', '/fleet/document-types/VEH-TAX', {
      as: 'FLT001',
      body: { vehicleTypeNos: ['TRACTOR', 'SPACESHIP'] }
    })
    expect(response.status).toBe(400)
  })
})
