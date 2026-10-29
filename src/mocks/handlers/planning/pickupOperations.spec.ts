import { beforeEach, describe, expect, it } from 'vitest'
import type { PickupNoteApi } from '@/modules/planning/loading/types/pickup.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const order = '/planning/transport-orders/TR-2026-0002'
const post = (url: string, body: Record<string, unknown> = {}, as = 'LIV001') =>
  call(server, 'post', url, { as, body, language: 'en' })
const get = (url: string, as = 'LIV001') => call(server, 'get', url, { as, language: 'en' })

async function incident() {
  const lists = (await get(`${order}/pickup-note/incident-lists`)).data.data as {
    incidentTypes: { no: string }[]
    reasonTypes: { no: string }[]
    reasonCodes: { no: string; reasonTypeNo: string }[]
  }
  const code = lists.reasonCodes[0]!
  return {
    incidentTypeNo: lists.incidentTypes[0]!.no,
    reasonTypeNo: code.reasonTypeNo,
    reasonCodeNo: code.no,
    comment: 'Client fermé'
  }
}

describe('operations on the notes', () => {
  it('fills in the driver of another vehicle and refuses one that cannot carry the plan (TRS01-US24)', async () => {
    const candidate = (
      await call(server, 'get', `${order}/pickup-note/vehicle-candidate`, {
        as: 'LIV001',
        query: { vehicleNo: 'VEH-001' }
      })
    ).data.data as {
      driverNo: string | null
    }
    expect(candidate).toHaveProperty('driverNo')
    // A tractor alone carries nothing.
    const refused = await post(`${order}/pickup-note/change-vehicle`, {
      vehicleNo: 'VEH-001',
      trailerNo: null,
      driverNo: 'UCT-014'
    })
    expect(refused.status).toBe(422)
    // The planner only reads the note.
    expect(
      (
        await post(
          `${order}/pickup-note/change-vehicle`,
          { vehicleNo: 'VEH-001', driverNo: 'UCT-014' },
          'PLN001'
        )
      ).status
    ).toBe(403)
  })

  it('changes the pickup site until the pickup is confirmed (TRS01-US24)', async () => {
    const changed = (await post(`${order}/pickup-note/change-site`, { siteNo: 'DEP-ALR' })).data
      .data as PickupNoteApi
    expect(changed.pickupSiteNo).toBe('DEP-ALR')
  })

  it('cancels a delivery note through an incident and frees its order (TRS01-US25)', async () => {
    const note = (await get(`${order}/pickup-note`)).data.data as PickupNoteApi
    const pointNo = note.deliveries[0]!.pointNo
    expect((await post(`${order}/points/${pointNo}/cancel`, {})).status).toBe(400)
    const done = (await post(`${order}/points/${pointNo}/cancel`, await incident())).data
      .data as PickupNoteApi
    expect(done.deliveries[0]!.state).toBe('cancelled')
    // Not loaded: the pickup note no longer asks for it.
    expect(done.compartments.flatMap((c) => c.entries)).toHaveLength(0)
    expect(server.db.deliveryRequests.find('DL-2026-0009')!.transportOrderNo).toBeNull()
  })

  it('deviates a delivery only to a recipient waiting for the same product, else back to the depot (TRS01-US26)', async () => {
    const note = (await get(`${order}/pickup-note`)).data.data as PickupNoteApi
    const pointNo = note.deliveries[0]!.pointNo
    expect(
      (
        await post(`${order}/points/${pointNo}/deviate`, {
          ...(await incident()),
          requestNo: 'DL-2026-0001'
        })
      ).status
    ).toBe(422)
    const back = (
      await post(`${order}/points/${pointNo}/deviate`, { ...(await incident()), toDepot: true })
    ).data.data as PickupNoteApi
    expect(back.deliveries[0]!.state).toBe('returned')
  })

  it('hands the order to another vehicle and tells both drivers (TRS01-US24)', async () => {
    const trip = server.db.trips.find(server.db.transportOrders.find('TR-2026-0002')!.tripNo!)!
    const previous = trip.driverNo
    const next = server.db.employees
      .all()
      .find((e) => e.no !== previous && e.no.startsWith('UCT-0'))!.no
    const done = await post(`${order}/pickup-note/change-vehicle`, {
      vehicleNo: 'VEH-001',
      trailerNo: 'VEH-011',
      driverNo: next
    })
    expect(done.status).toBe(200)
    expect(server.db.trips.find(trip.no)!.vehicleNo).toBe('VEH-001')
    const kinds = server.db.notifications.all().map((row) => [row.employeeNo, row.kind])
    expect(kinds).toContainEqual([previous, 'order_withdrawn'])
    expect(kinds).toContainEqual([next, 'order_assigned'])
  })
})
