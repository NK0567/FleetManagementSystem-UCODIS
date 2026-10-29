import { describe, expect, it } from 'vitest'
import { createTestServer } from '../../testing'
import { tripDeviations } from './deviationDetection'

describe('the corridor of the trip plan (TRS01-US11)', () => {
  it('detects the exit from the corridor validated on the transport order', () => {
    const server = createTestServer()
    const db = server.db
    const trip = db.trips.findOrFail('TRP-00006')
    const sample = db.telematicsEvents.all()[0]!
    db.telematicsEvents.insert({
      ...sample,
      no: 'TEV-CORRIDOR',
      tripNo: trip.no,
      vehicleNo: trip.vehicleNo,
      occurredAt: '2026-09-04T09:00:00',
      latitude: -18.6,
      longitude: 47.9
    } as typeof sample)
    const base = db.deviationTypes.findOrFail('OFF-ROUTE')
    const types = new Map([
      ['OFF-ROUTE', { ...base, active: true, autoDetected: true, threshold: 1e9 }]
    ])
    const offRoute = () =>
      tripDeviations(db, trip, '2026-09-04T09:30:00', types).filter(
        (item) => item.deviationTypeNo === 'OFF-ROUTE'
      )
    expect(offRoute()).toHaveLength(0)
    db.transportOrders.update('TR-2026-0003', {
      corridorKm: 5,
      routePlanValidatedAt: '2026-09-03T18:00:00'
    })
    expect(offRoute()).toHaveLength(1)
  })
})
