import { pointBetween } from '@/utils/geo'
import { addMinutes } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { nowIso } from '../../clock'
import { tripTrack } from './tripTracking'

/** The telematics reading of a vehicle standing still, with its duration in minutes. */
const LONG_STOP_EVENT = 'LONG-STOP'
const SYSTEM_USER = 'SYSTEM'

/** How long the simulated driver rests on the road, in minutes: beyond the threshold of a rest. */
const SIMULATED_REST_MIN = 75

/**
 * The demonstration has no real GPS unit, so « simulate a movement » also plays what the units
 * of a vehicle on the road would report. Two things happen on the trips on the road, so that the
 * detection of the control room has something to find:
 * - the driver passes the stops of his trip one after the other, but skips the first checkpoint
 *   (the stop is never recorded as passed, a later one is: « missed stop »);
 * - he rests 75 minutes between the last two stops, outside any parking (« rest outside a
 *   designated parking »).
 * Only the simulation does this; the real clock never invents a reading.
 */
export function playSimulatedReadings(db: MockDatabase, now: string): void {
  for (const trip of db.trips.all().filter((row) => row.status === 'in_progress')) {
    const { stops, arrivals } = tripTrack(db, trip)
    const skipped = trip.stops.findIndex((stop) => stop.role === 'check')
    let changed = false
    const next = trip.stops.map((stop, index) => {
      const arrival = arrivals[index]
      if (stop.passedAt || index === skipped || !arrival || arrival > now) return stop
      changed = true
      return { ...stop, passedAt: arrival }
    })
    if (changed) db.trips.update(trip.no, { stops: next })

    // The rest: halfway between the last two stops, once the vehicle has left the first of them.
    const from = stops.at(-2)
    const to = stops.at(-1)
    const leaves = arrivals.at(-2)
    if (!from || !to || !leaves || stops.length < 3) continue
    const at = addMinutes(leaves, stops.at(-2)?.breakMin ?? 0)
    if (at > now) continue
    const already = db.telematicsEvents
      .all()
      .some(
        (event) =>
          event.tripNo === trip.no &&
          event.eventTypeNo === LONG_STOP_EVENT &&
          event.createdBy === SYSTEM_USER
      )
    if (already) continue
    const point = pointBetween(from, to, 0.4)
    const stamp = nowIso()
    db.telematicsEvents.insert({
      no: nextNo(
        db.telematicsEvents.all().map((row) => row.no),
        'TEL-',
        6
      ),
      eventTypeNo: LONG_STOP_EVENT,
      vehicleNo: trip.vehicleNo,
      driverNo: trip.driverNo,
      tripNo: trip.no,
      occurredAt: addMinutes(at, 20),
      source: 'box',
      value: SIMULATED_REST_MIN,
      latitude: point.latitude,
      longitude: point.longitude,
      detail: '',
      infractionNo: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
      acknowledgementComment: '',
      createdAt: stamp,
      createdBy: SYSTEM_USER,
      modifiedAt: stamp,
      modifiedBy: SYSTEM_USER
    })
  }
}
