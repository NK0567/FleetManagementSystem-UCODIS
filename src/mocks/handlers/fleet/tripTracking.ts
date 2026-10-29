import { expectedArrivals, type TrackedStop } from '@/modules/fleet/live-map/domain/livePosition'
import { plannedSchedule } from '@/modules/fleet/route-templates/domain/routeTemplate'
import type { MockDatabase } from '../../db/database'
import type { TripRow } from '../../fixtures/fleet/trips'

export interface TripTrackStop extends TrackedStop {
  siteNo: string
  siteName: string
}

/** The stops of a trip placed on the map, with their planned and expected times. */
export function tripTrack(
  db: MockDatabase,
  trip: TripRow
): { stops: TripTrackStop[]; arrivals: string[] } {
  const schedule = plannedSchedule(trip.plannedDeparture, trip.stops)
  const stops = trip.stops.map((stop, index) => {
    const site = db.sites.find(stop.siteNo)
    return {
      siteNo: stop.siteNo,
      siteName: site?.name ?? stop.siteNo,
      latitude: site?.latitude ?? 0,
      longitude: site?.longitude ?? 0,
      plannedAt: schedule[index] ?? trip.plannedDeparture,
      passedAt: stop.passedAt,
      breakMin: stop.breakMin
    }
  })
  return { stops, arrivals: expectedArrivals(stops) }
}

/** When the vehicle was on the road for this trip: from leaving the first stop to the last one. */
export function tripSpan(trip: TripRow, now: string): { from: string; to: string } | null {
  if (!trip.actualDeparture) return null
  if (trip.status === 'in_progress') return { from: trip.actualDeparture, to: now }
  if (trip.status !== 'completed' && trip.status !== 'closed') return null
  return { from: trip.actualDeparture, to: trip.actualArrival ?? trip.actualDeparture }
}
