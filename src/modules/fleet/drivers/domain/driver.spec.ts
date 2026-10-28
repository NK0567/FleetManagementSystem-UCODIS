import { describe, expect, it } from 'vitest'
import { driverAvailability, driverIneligibility, type DriverFacts } from './driver'

const ready: DriverFacts = {
  onStaff: true,
  suspended: false,
  positionDrives: true,
  drivingAuthorized: true,
  onLeave: false,
  documentsCompliant: true,
  onTrip: false,
  tripPlanned: false
}

describe('driverIneligibility', () => {
  it('accepts an authorized driver on staff', () => {
    expect(driverIneligibility(ready)).toEqual([])
  })

  it('gives every reason that blocks the assignment', () => {
    expect(
      driverIneligibility({
        ...ready,
        drivingAuthorized: false,
        onLeave: true,
        documentsCompliant: false
      })
    ).toEqual(['not_authorized', 'on_leave', 'documents'])
  })

  it('does not block on documents that are not tracked yet', () => {
    expect(driverIneligibility({ ...ready, documentsCompliant: null })).toEqual([])
  })
})

describe('driverAvailability', () => {
  it('puts absence before trips', () => {
    expect(driverAvailability({ ...ready, onLeave: true, onTrip: true })).toBe('on_leave')
    expect(driverAvailability({ ...ready, suspended: true })).toBe('unavailable')
    expect(driverAvailability({ ...ready, tripPlanned: true })).toBe('trip_planned')
    expect(driverAvailability(ready)).toBe('available')
  })
})
