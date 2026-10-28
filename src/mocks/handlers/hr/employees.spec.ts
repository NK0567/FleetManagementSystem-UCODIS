import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const hire = {
  firstName: 'Volana',
  lastName: 'Rasoamanana',
  jobPositionNo: 'DEP',
  orgUnitNo: 'DEP',
  categoryNo: 'CAT-D',
  siteCode: 'DEP-TNJ',
  phone: '034 12 999 01',
  nationalId: '101 234 999 001',
  contractType: 'fixed_term',
  hireDate: '2026-09-01'
}

type EmployeeRecord = {
  no: string
  fullName: string
  jobPositionName: string
  status: string
  statusReason: string
  exitDate: string | null
  drivingAuthorized: boolean
  drivingAuthorizedBy: string | null
}

describe('employee endpoints', () => {
  it('numbers a new employee after the highest number and joins the names', async () => {
    const response = await call(server, 'post', '/hr/employees', { as: 'FLT001', body: hire })
    expect(response.status).toBe(201)
    expect(response.data.data).toMatchObject({
      no: 'UCT-025',
      fullName: 'Volana Rasoamanana',
      jobPositionName: 'Agent de dépôt',
      status: 'active'
    })
  })

  it('refuses an identity document already registered, on creation and on update', async () => {
    const onCreate = await call(server, 'post', '/hr/employees', {
      as: 'ADM001',
      body: { ...hire, nationalId: '101 234 567 002' }
    })
    expect(onCreate.status).toBe(409)
    expect(onCreate.data).toMatchObject({ duplicateField: 'nationalId', duplicateValue: 'UCT-002' })

    const onUpdate = await call(server, 'patch', '/hr/employees/UCT-003', {
      as: 'ADM001',
      body: { nationalId: '101 234 567 002' }
    })
    expect(onUpdate.status).toBe(409)
  })

  it('rejects a malformed email and an unknown position', async () => {
    const email = await call(server, 'post', '/hr/employees', {
      as: 'ADM001',
      body: { ...hire, email: 'not-an-email' }
    })
    const position = await call(server, 'post', '/hr/employees', {
      as: 'ADM001',
      body: { ...hire, jobPositionNo: 'NOPE' }
    })
    expect(email.status).toBe(400)
    expect(position.status).toBe(400)
  })

  it('keeps the reason of a suspension and requires one', async () => {
    const missing = await call(server, 'post', '/hr/employees/UCT-010/status', {
      as: 'FLT001',
      body: { status: 'suspended' }
    })
    expect(missing.status).toBe(422)

    const response = await call(server, 'post', '/hr/employees/UCT-010/status', {
      as: 'FLT001',
      body: { status: 'suspended', reason: 'Visite médicale expirée' }
    })
    expect(response.data.data).toMatchObject({
      status: 'suspended',
      statusReason: 'Visite médicale expirée'
    })
  })

  it('archives an employee for good and never deletes one', async () => {
    const archived = await call(server, 'post', '/hr/employees/UCT-019/archive', {
      as: 'ADM001',
      body: { reason: 'Démission' }
    })
    const record = archived.data.data as EmployeeRecord
    expect(record.status).toBe('archived')
    expect(record.exitDate).not.toBeNull()
    expect(record.drivingAuthorized).toBe(false)

    const update = await call(server, 'patch', '/hr/employees/UCT-019', {
      as: 'ADM001',
      body: { phone: '000' }
    })
    const remove = await call(server, 'delete', '/hr/employees/UCT-019', { as: 'ADM001' })
    expect(update.status).toBe(409)
    expect(remove.status).toBe(405)
  })

  it('records who authorized a driver, and only for positions that drive', async () => {
    const driver = await call(server, 'post', '/hr/employees/UCT-012/driving-authorization', {
      as: 'FLT001',
      body: { authorized: true }
    })
    expect(driver.data.data).toMatchObject({
      drivingAuthorized: true,
      drivingAuthorizedBy: 'FLT001'
    })

    const clerk = await call(server, 'post', '/hr/employees/UCT-004/driving-authorization', {
      as: 'FLT001',
      body: { authorized: true }
    })
    expect(clerk.status).toBe(422)
  })

  it('leaves status changes to profiles with the execute right', async () => {
    const response = await call(server, 'post', '/hr/employees/UCT-010/status', {
      as: 'DIR001',
      body: { status: 'on_leave' }
    })
    expect(response.status).toBe(403)
  })
})
