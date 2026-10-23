import { plannedSchedule } from '@/modules/fleet/route-templates/domain/routeTemplate'
import type { TimeWindow } from '@/modules/fleet/trips/domain/trip'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TripRow } from '../../fixtures/fleet/trips'

export function plannedArrival(trip: Pick<TripRow, 'plannedDeparture' | 'stops'>): string {
  return plannedSchedule(trip.plannedDeparture, trip.stops).at(-1) ?? trip.plannedDeparture
}

/** The time a trip holds its resources: open-ended once on the road. */
export function tripWindow(trip: TripRow): TimeWindow {
  if (trip.status === 'in_progress') {
    return { start: trip.actualDeparture ?? trip.plannedDeparture, end: null }
  }
  return { start: trip.plannedDeparture, end: plannedArrival(trip) }
}

/** Trips on the road and trips planned for today, by vehicle (tractor or trailer) and by driver. */
export function tripIndex(db: MockDatabase) {
  const today = todayIso()
  const onRoad = db.trips.all().filter((trip) => trip.status === 'in_progress')
  const plannedToday = db.trips
    .all()
    .filter((trip) => trip.status === 'planned' && trip.plannedDeparture.startsWith(today))
  const byVehicle = new Map<string, TripRow>()
  for (const trip of onRoad) {
    byVehicle.set(trip.vehicleNo, trip)
    if (trip.trailerNo) byVehicle.set(trip.trailerNo, trip)
  }
  return {
    onRoadByVehicle: byVehicle,
    onRoadByDriver: new Map(onRoad.map((trip) => [trip.driverNo, trip])),
    plannedTodayByDriver: new Map(plannedToday.map((trip) => [trip.driverNo, trip]))
  }
}
