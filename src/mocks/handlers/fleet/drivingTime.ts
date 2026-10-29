import { drivenMinutes, drivingBreaches, tripLegs } from '@/modules/fleet/trips/domain/drivingTime'
import type {
  DriverDrivingTimeApi,
  TripDrivingTimeApi
} from '@/modules/fleet/trips/types/drivingTime.types'
import { addDays, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TripRow } from '../../fixtures/fleet/trips'
import { routeParam } from '../../http/crudResource'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { fleetSettings } from './settings'

const PERIOD_DAYS = 30

const legsOf = (trip: TripRow) => tripLegs(trip.stops, trip.plannedDeparture)

/**
 * A trip checked against the driving-time limits. Weekly driving adds what the driver drove on
 * his other trips of the seven days before this one.
 */
export function tripDrivingTime(db: MockDatabase, trip: TripRow): TripDrivingTimeApi {
  const limits = fleetSettings(db).drivingTime
  const { legs, source } = legsOf(trip)
  const start = legs[0]?.start ?? trip.plannedDeparture
  const weekBefore = `${addDays(start.slice(0, 10), -7)}T00:00:00`
  const earlierWeekMin = db.trips
    .all()
    .filter(
      (other) =>
        other.no !== trip.no &&
        other.driverNo === trip.driverNo &&
        other.status !== 'cancelled' &&
        (other.actualDeparture ?? other.plannedDeparture) < start &&
        (other.actualDeparture ?? other.plannedDeparture) >= weekBefore
    )
    .reduce((total, other) => total + drivenMinutes(legsOf(other).legs), 0)
  return {
    tripNo: trip.no,
    driverNo: trip.driverNo,
    source,
    drivenMin: drivenMinutes(legs),
    breaches: trip.status === 'cancelled' ? [] : drivingBreaches(legs, limits, earlierWeekMin)
  }
}

export function driverDrivingTime(db: MockDatabase, driverNo: string): DriverDrivingTimeApi {
  const since = addDays(todayIso(), -PERIOD_DAYS)
  return {
    driverNo,
    periodDays: PERIOD_DAYS,
    trips: db.trips
      .all()
      .filter(
        (trip) =>
          trip.driverNo === driverNo &&
          trip.status !== 'cancelled' &&
          trip.plannedDeparture.slice(0, 10) > since
      )
      .sort((a, b) => b.plannedDeparture.localeCompare(a.plannedDeparture))
      .map((trip) => ({
        ...tripDrivingTime(db, trip),
        plannedDeparture: trip.plannedDeparture,
        status: trip.status
      }))
      .filter((trip) => trip.breaches.length > 0)
  }
}

export function registerDrivingTimeHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/fleet/trips/:no/driving-time', { feature: 'TRIP', action: 'read' }, (request) =>
    ok(tripDrivingTime(db, db.trips.findOrFail(routeParam(request, 'no'))))
  )
  router.get(
    '/fleet/drivers/:no/driving-time',
    { feature: 'DRIVER', action: 'read' },
    (request) => {
      const driver = db.employees.findOrFail(routeParam(request, 'no'))
      return ok(driverDrivingTime(db, driver.no))
    }
  )
}
