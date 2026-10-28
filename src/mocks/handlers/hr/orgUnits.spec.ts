import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const newUnit = {
  no: 'ATL',
  name: 'Atelier pneumatique',
  type: 'team',
  parentNo: 'MNT',
  siteCode: 'GAR-TNR'
}

type UnitRecord = { no: string; headcount: number; totalHeadcount: number; status: string }

describe('org unit endpoints', () => {
  it('derives the direct and total headcount from the employees on staff', async () => {
    const root = (await call(server, 'get', '/hr/org-units/UCT', { as: 'ADM001' })).data
      .data as UnitRecord
    const team = (await call(server, 'get', '/hr/org-units/CND', { as: 'ADM001' })).data
      .data as UnitRecord
    const onStaff = server.db.employees
      .all()
      .filter((employee) => !['archived', 'contract_ended'].includes(employee.status))
    expect(root.totalHeadcount).toBe(onStaff.length)
    expect(team.totalHeadcount).toBe(team.headcount)
  })

  it('creates a unit pending validation, then validates it once', async () => {
    const created = await call(server, 'post', '/hr/org-units', { as: 'ADM001', body: newUnit })
    expect(created.status).toBe(201)
    expect(created.data.data).toMatchObject({ no: 'ATL', status: 'pending_validation' })

    const validated = await call(server, 'post', '/hr/org-units/ATL/validate', { as: 'ADM001' })
    expect(validated.data.data).toMatchObject({ status: 'validated', validatedBy: 'ADM001' })

    const again = await call(server, 'post', '/hr/org-units/ATL/validate', { as: 'ADM001' })
    expect(again.status).toBe(409)
  })

  it('requires a parent and refuses a second root', async () => {
    const response = await call(server, 'post', '/hr/org-units', {
      as: 'ADM001',
      body: { ...newUnit, parentNo: null }
    })
    expect(response.status).toBe(400)
    expect(response.data).toMatchObject({ errors: ['parentNo'] })
  })

  it('refuses to attach a unit under one of its sub-units', async () => {
    const response = await call(server, 'patch', '/hr/org-units/FLT', {
      as: 'ADM001',
      body: { parentNo: 'CND' }
    })
    expect(response.status).toBe(422)
    expect(server.db.orgUnits.find('FLT')?.parentNo).toBe('UCT')
  })

  it('refuses to delete a unit that still has sub-units, employees or positions', async () => {
    const withChildren = await call(server, 'delete', '/hr/org-units/FLT', { as: 'ADM001' })
    const withEmployees = await call(server, 'delete', '/hr/org-units/CND', { as: 'ADM001' })
    expect(withChildren.status).toBe(409)
    expect(withEmployees.status).toBe(409)

    await call(server, 'post', '/hr/org-units', { as: 'ADM001', body: newUnit })
    const empty = await call(server, 'delete', '/hr/org-units/ATL', { as: 'ADM001' })
    expect(empty.status).toBe(200)
  })

  it('leaves validation to profiles with the execute right', async () => {
    const response = await call(server, 'post', '/hr/org-units/OPV/validate', { as: 'FLT001' })
    expect(response.status).toBe(403)
  })
})
