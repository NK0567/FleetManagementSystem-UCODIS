import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const category = { no: 'cat-e', name: 'Stagiaire', description: '', annualLeaveDays: 12 }

describe('employee category endpoints', () => {
  it('counts the employees on staff of each category', async () => {
    const response = await call(server, 'get', '/hr/employee-categories/CAT-A', { as: 'ADM001' })
    const record = response.data.data as { employeeCount: number }
    const expected = server.db.employees
      .all()
      .filter((employee) => employee.categoryNo === 'CAT-A' && employee.status !== 'archived')
    expect(record.employeeCount).toBe(expected.length)
  })

  it('creates a category with an upper-case code and audit fields', async () => {
    const response = await call(server, 'post', '/hr/employee-categories', {
      as: 'FLT001',
      body: category
    })
    expect(response.status).toBe(201)
    expect(response.data.data).toMatchObject({
      no: 'CAT-E',
      active: true,
      employeeCount: 0,
      createdBy: 'FLT001'
    })
  })

  it('refuses a duplicate code, a missing name and a negative entitlement', async () => {
    const duplicate = await call(server, 'post', '/hr/employee-categories', {
      as: 'ADM001',
      body: { ...category, no: 'CAT-A' }
    })
    const noName = await call(server, 'post', '/hr/employee-categories', {
      as: 'ADM001',
      body: { ...category, name: ' ' }
    })
    const negative = await call(server, 'post', '/hr/employee-categories', {
      as: 'ADM001',
      body: { ...category, annualLeaveDays: -1 }
    })
    expect(duplicate.status).toBe(409)
    expect(noName.status).toBe(400)
    expect(negative.status).toBe(400)
  })

  it('updates only the fields sent', async () => {
    const response = await call(server, 'patch', '/hr/employee-categories/CAT-B', {
      as: 'ADM001',
      body: { annualLeaveDays: 28 }
    })
    expect(response.data.data).toMatchObject({
      no: 'CAT-B',
      name: 'Agent de maîtrise',
      annualLeaveDays: 28
    })
  })

  it('refuses to delete a category still in use', async () => {
    const response = await call(server, 'delete', '/hr/employee-categories/CAT-A', { as: 'ADM001' })
    expect(response.status).toBe(409)
    expect(server.db.employeeCategories.exists('CAT-A')).toBe(true)
  })

  it('leaves deletion to the administrator', async () => {
    await call(server, 'post', '/hr/employee-categories', { as: 'ADM001', body: category })
    const fleetManager = await call(server, 'delete', '/hr/employee-categories/CAT-E', {
      as: 'FLT001'
    })
    const admin = await call(server, 'delete', '/hr/employee-categories/CAT-E', { as: 'ADM001' })
    expect(fleetManager.status).toBe(403)
    expect(admin.status).toBe(200)
  })
})

describe('leave type endpoints', () => {
  it('keeps statutory types active and undeletable', async () => {
    const disable = await call(server, 'patch', '/hr/leave-types/CA', {
      as: 'ADM001',
      body: { active: false }
    })
    const remove = await call(server, 'delete', '/hr/leave-types/CA', { as: 'ADM001' })
    expect(disable.status).toBe(422)
    expect(remove.status).toBe(409)
  })

  it('refuses to delete a type used by requests and deletes an unused one', async () => {
    const used = await call(server, 'delete', '/hr/leave-types/REC', { as: 'ADM001' })
    const unused = await call(server, 'delete', '/hr/leave-types/SS', { as: 'ADM001' })
    expect(used.status).toBe(409)
    expect(unused.status).toBe(200)
  })
})

describe('job position endpoints', () => {
  it('derives the actual headcount and the gap from the employees', async () => {
    const response = await call(server, 'get', '/hr/job-positions/CND', { as: 'ADM001' })
    const record = response.data.data as {
      orgUnitName: string
      plannedHeadcount: number
      actualHeadcount: number
      headcountGap: number
    }
    expect(record.orgUnitName).not.toBe('')
    expect(record.headcountGap).toBe(record.plannedHeadcount - record.actualHeadcount)
  })

  it('refuses a position attached to an unknown unit', async () => {
    const response = await call(server, 'post', '/hr/job-positions', {
      as: 'ADM001',
      body: { no: 'MEC', name: 'Mécanicien', orgUnitNo: 'NOPE', defaultCategoryNo: 'CAT-C' }
    })
    expect(response.status).toBe(400)
    expect(response.data).toMatchObject({ errorCode: 'UNKNOWN_REFERENCE', errors: ['orgUnitNo'] })
  })
})

describe('public holiday endpoints', () => {
  it('numbers new holidays after the highest existing one', async () => {
    const response = await call(server, 'post', '/hr/public-holidays', {
      as: 'ADM001',
      body: { name: 'Pont', date: '2026-12-24', recurring: false }
    })
    const count = server.db.publicHolidays.all().length
    expect(response.data.data).toMatchObject({ no: `PH-${String(count).padStart(3, '0')}` })
  })

  it('rejects an impossible date', async () => {
    const response = await call(server, 'post', '/hr/public-holidays', {
      as: 'ADM001',
      body: { name: 'Pont', date: '2026-02-30' }
    })
    expect(response.status).toBe(400)
  })
})

describe('reference data', () => {
  it('serves the HR lists used by selects and filters', async () => {
    const response = await call(server, 'get', '/reference/all', { as: 'CLI001' })
    const data = response.data.data as Record<string, { code: string }[]>
    expect(Object.keys(data)).toEqual(
      expect.arrayContaining([
        'sites',
        'orgUnits',
        'jobPositions',
        'employeeCategories',
        'leaveTypes',
        'employees'
      ])
    )
    expect(data.orgUnits?.some((unit) => unit.code === 'FLT')).toBe(true)
  })
})
