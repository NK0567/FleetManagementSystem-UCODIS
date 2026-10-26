import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, startOfIsoWeek, todayIso } from '@/utils/date'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const monday = startOfIsoWeek(addDays(todayIso(), 50))

describe('my space', () => {
  it('returns the signed-in driver and refuses everyone else', async () => {
    const mine = await call(server, 'get', '/me', { as: 'CND001' })
    expect(mine.status).toBe(200)
    expect(mine.data.data).toEqual(
      expect.objectContaining({ employeeNo: 'UCT-012', mayDeclare: true })
    )

    const assistant = await call(server, 'get', '/me', { as: 'AID001' })
    expect(assistant.status).toBe(200)
    expect(assistant.data.data).toEqual(
      expect.objectContaining({ employeeNo: 'UCT-020', mayDeclare: false })
    )

    const planner = await call(server, 'get', '/me', { as: 'FLT001' })
    expect(planner.status).toBe(403)
  })

  it('lists and creates only the driver own absences', async () => {
    const list = await call(server, 'get', '/hr/leave-requests', {
      as: 'CND001',
      query: { pageSize: 100 }
    })
    const items = (list.data.data as { items: { employeeNo: string }[] }).items
    expect(list.status).toBe(200)
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((row) => row.employeeNo === 'UCT-012')).toBe(true)

    const other = await call(server, 'post', '/hr/leave-requests', {
      as: 'CND001',
      body: {
        employeeNo: 'UCT-011',
        leaveTypeNo: 'CA',
        startDate: monday,
        endDate: monday,
        reason: 'Vacances'
      }
    })
    expect(other.status).toBe(403)

    const own = await call(server, 'post', '/hr/leave-requests', {
      as: 'CND001',
      body: {
        employeeNo: 'UCT-012',
        leaveTypeNo: 'SS',
        startDate: monday,
        endDate: monday,
        reason: 'Sans solde'
      }
    })
    expect(own.status).toBe(201)
  })
})
