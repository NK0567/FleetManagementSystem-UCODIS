import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, startOfIsoWeek, todayIso } from '@/utils/date'
import type { LeaveBalanceApi } from '@/modules/hr/leave-balances/types/leaveBalance.types'
import type { LeaveRequestApi } from '@/modules/hr/leave-requests/types/leaveRequest.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import { workingDaysOf } from './views'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

/** A Monday-to-Friday week far enough ahead for every notice period. */
const monday = startOfIsoWeek(addDays(todayIso(), 50))
const friday = addDays(monday, 4)

const ownAnnualLeave = {
  employeeNo: 'UCT-004',
  leaveTypeNo: 'CA',
  startDate: monday,
  endDate: friday,
  reason: 'Vacances'
}

async function list(as: string) {
  const response = await call(server, 'get', '/hr/leave-requests', {
    as,
    query: { pageSize: 100 }
  })
  return (response.data.data as { items: LeaveRequestApi[] }).items
}

async function balance(as: string, employeeNo: string, leaveTypeNo: string, year: number) {
  const response = await call(
    server,
    'get',
    `/hr/leave-balances/${employeeNo}-${leaveTypeNo}-${year}`,
    {
      as
    }
  )
  return response.data.data as LeaveBalanceApi
}

describe('leave request endpoints', () => {
  it('shows office staff their own requests only', async () => {
    const own = await list('CLI001')
    const all = await list('FLT001')
    expect(own.length).toBeGreaterThan(0)
    expect(own.every((request) => request.employeeNo === 'UCT-004')).toBe(true)
    expect(all.length).toBeGreaterThan(own.length)
  })

  it('creates a pending request whose working days the server counts', async () => {
    const response = await call(server, 'post', '/hr/leave-requests', {
      as: 'CLI001',
      body: ownAnnualLeave
    })
    expect(response.status).toBe(201)
    expect(response.data.data).toMatchObject({
      employeeNo: 'UCT-004',
      leaveTypeName: 'Congé annuel',
      status: 'pending',
      days: workingDaysOf(server.db, monday, friday)
    })
  })

  it('refuses a request for someone else from an office profile', async () => {
    const response = await call(server, 'post', '/hr/leave-requests', {
      as: 'CLI001',
      body: { ...ownAnnualLeave, employeeNo: 'UCT-005' }
    })
    expect(response.status).toBe(403)
  })

  it('refuses overlapping periods, reversed periods, short notice and a short balance', async () => {
    await call(server, 'post', '/hr/leave-requests', { as: 'CLI001', body: ownAnnualLeave })
    const overlap = await call(server, 'post', '/hr/leave-requests', {
      as: 'CLI001',
      body: { ...ownAnnualLeave, startDate: friday, endDate: addDays(friday, 3) }
    })
    const reversed = await call(server, 'post', '/hr/leave-requests', {
      as: 'FLT001',
      body: { ...ownAnnualLeave, employeeNo: 'UCT-005', startDate: friday, endDate: monday }
    })
    const tomorrow = addDays(todayIso(), 1)
    const shortNotice = await call(server, 'post', '/hr/leave-requests', {
      as: 'FLT001',
      body: { ...ownAnnualLeave, employeeNo: 'UCT-005', startDate: tomorrow, endDate: tomorrow }
    })
    const tooLong = await call(server, 'post', '/hr/leave-requests', {
      as: 'FLT001',
      body: { ...ownAnnualLeave, employeeNo: 'UCT-005', endDate: addDays(monday, 80) }
    })
    expect(overlap.status).toBe(409)
    expect(reversed.status).toBe(422)
    expect(shortNotice.status).toBe(422)
    expect(tooLong.status).toBe(422)
  })

  it('decides a pending request once, with a comment for a send-back or a rejection', async () => {
    const shortComment = await call(server, 'post', '/hr/leave-requests/LR-0002/reject', {
      as: 'FLT001',
      body: { comment: 'Non.' }
    })
    expect(shortComment.status).toBe(422)

    const approved = await call(server, 'post', '/hr/leave-requests/LR-0001/approve', {
      as: 'FLT001',
      body: {}
    })
    expect(approved.data.data).toMatchObject({ status: 'approved', decidedBy: 'FLT001' })

    const again = await call(server, 'post', '/hr/leave-requests/LR-0001/reject', {
      as: 'ADM001',
      body: { comment: 'Changement de planning imprévu.' }
    })
    expect(again.status).toBe(409)
  })

  it('moves the days from pending to taken when a request is approved', async () => {
    const request = server.db.leaveRequests.findOrFail('LR-0001')
    const year = Number(request.startDate.slice(0, 4))
    const before = await balance('ADM001', 'UCT-010', 'CA', year)
    await call(server, 'post', '/hr/leave-requests/LR-0001/approve', { as: 'FLT001', body: {} })
    const after = await balance('ADM001', 'UCT-010', 'CA', year)
    const days = workingDaysOf(server.db, request.startDate, request.endDate)
    expect(after.takenDays).toBe(before.takenDays + days)
    expect(after.pendingDays).toBe(before.pendingDays - days)
    expect(after.availableDays).toBe(before.availableDays)
  })

  it('leaves decisions to the administrator and the fleet manager, never on their own leave', async () => {
    const management = await call(server, 'post', '/hr/leave-requests/LR-0001/approve', {
      as: 'DIR001',
      body: {}
    })
    expect(management.status).toBe(403)

    const created = await call(server, 'post', '/hr/leave-requests', {
      as: 'ADM001',
      body: { ...ownAnnualLeave, employeeNo: 'UCT-001' }
    })
    const no = (created.data.data as LeaveRequestApi).no
    const own = await call(server, 'post', `/hr/leave-requests/${no}/approve`, {
      as: 'ADM001',
      body: {}
    })
    const other = await call(server, 'post', `/hr/leave-requests/${no}/approve`, {
      as: 'FLT001',
      body: {}
    })
    expect(own.status).toBe(403)
    expect(other.status).toBe(200)
  })

  it('summarises the pending requests', async () => {
    const response = await call(server, 'get', '/hr/leave-requests/summary', { as: 'FLT001' })
    const pending = server.db.leaveRequests.all().filter((row) => row.status === 'pending')
    expect(response.data.data).toMatchObject({ pending: pending.length })
  })
})

describe('leave balance endpoints', () => {
  it('shows office staff their own balances only', async () => {
    const response = await call(server, 'get', '/hr/leave-balances', {
      as: 'CLI001',
      query: { pageSize: 100 }
    })
    const items = (response.data.data as { items: LeaveBalanceApi[] }).items
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((row) => row.employeeNo === 'UCT-004')).toBe(true)
  })
})
