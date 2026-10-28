import { beforeEach, describe, expect, it } from 'vitest'
import type { HrDashboardApi } from '@/modules/hr/dashboard/types/hrDashboard.types'
import type { MyPlanningApi } from '@/modules/hr/my-planning/types/myPlanning.types'
import { startOfIsoWeek } from '@/utils/date'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

describe('HR dashboard endpoint', () => {
  it('counts the staff and the pending requests, oldest first', async () => {
    const response = await call(server, 'get', '/hr/dashboard', { as: 'FLT001' })
    const dashboard = response.data.data as HrDashboardApi
    const pending = server.db.leaveRequests.all().filter((row) => row.status === 'pending')
    expect(dashboard.leave.pending).toBe(pending.length)
    const submitted = dashboard.leave.pendingRequests.map((row) => row.no)
    expect(submitted).toEqual(
      [...pending]
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
        .map((row) => row.no)
        .slice(0, 5)
    )
    expect(dashboard.headcount.onStaff).toBeGreaterThan(dashboard.headcount.drivers)
    expect(dashboard.attention.pendingOrgUnits.map((unit) => unit.no)).toEqual(['OPV'])
  })

  it('stays with the people who manage the staff', async () => {
    const office = await call(server, 'get', '/hr/dashboard', { as: 'CLI001' })
    const management = await call(server, 'get', '/hr/dashboard', { as: 'DIR001' })
    expect(office.status).toBe(403)
    expect(management.status).toBe(200)
  })
})

describe('my planning endpoint', () => {
  it("shows the user's week with their own leave", async () => {
    const leave = server.db.leaveRequests.findOrFail('LR-0005')
    const response = await call(server, 'get', '/hr/my-planning', {
      as: 'CLI001',
      query: { weekStart: leave.startDate }
    })
    const planning = response.data.data as MyPlanningApi
    expect(planning.weekStart).toBe(startOfIsoWeek(leave.startDate))
    expect(planning.days).toHaveLength(7)
    const day = planning.days.find((candidate) => candidate.date === leave.startDate)
    expect(day?.leave).toMatchObject({ no: 'LR-0005', status: 'approved' })
  })

  it('rejects a malformed week', async () => {
    const response = await call(server, 'get', '/hr/my-planning', {
      as: 'CLI001',
      query: { weekStart: 'next week' }
    })
    expect(response.status).toBe(400)
  })
})
