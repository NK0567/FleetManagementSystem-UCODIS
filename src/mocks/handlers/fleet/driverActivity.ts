import type { DriverActivityApi } from '@/modules/fleet/drivers/types/driver.types'
import { addDays, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { routeParam } from '../../http/crudResource'
import { notFound } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { driverEmployees } from './drivers'
import { fuelRefillsApi } from './fuelRefills'
import { infractionsApi } from './infractions'
import { routeDeviationsApi } from './routeDeviations'
import { trainingsApi } from './trainings'
import { tripsApi } from './trips'

/** Totals cover this many days; the lists show the latest records whatever their age. */
const PERIOD_DAYS = 30
const LATEST = 10

const newestFirst = <T>(rows: T[], date: (row: T) => string) =>
  [...rows].sort((a, b) => date(b).localeCompare(date(a))).slice(0, LATEST)

export function driverActivity(
  db: MockDatabase,
  driverNo: string,
  request: MockRequest
): DriverActivityApi {
  const since = addDays(todayIso(), -PERIOD_DAYS)
  const recent = (value: string | null) => !!value && value.slice(0, 10) > since

  const trips = tripsApi(db).filter((trip) => trip.driverNo === driverNo)
  const finished = trips.filter(
    (trip) =>
      (trip.status === 'completed' || trip.status === 'closed') && recent(trip.actualArrival)
  )
  const tripNos = new Set(trips.map((trip) => trip.no))
  const refills = fuelRefillsApi(db, request.language).filter(
    (refill) => refill.driverNo === driverNo
  )
  const recentRefills = refills.filter((refill) => recent(refill.refueledAt))

  return {
    periodDays: PERIOD_DAYS,
    trips: newestFirst(trips, (trip) => trip.plannedDeparture).map((trip) => ({
      no: trip.no,
      routeName: trip.routeName,
      vehiclePlate: trip.vehiclePlate,
      plannedDeparture: trip.plannedDeparture,
      status: trip.status,
      distanceKm: trip.distanceKm
    })),
    tripsFinished: finished.length,
    kmDriven: finished.reduce((total, trip) => total + (trip.distanceKm ?? 0), 0),
    refills: newestFirst(refills, (refill) => refill.refueledAt).map((refill) => ({
      no: refill.no,
      refueledAt: refill.refueledAt,
      vehiclePlate: refill.vehiclePlate,
      liters: refill.liters,
      amount: refill.amount,
      status: refill.status
    })),
    litersRefueled: Math.round(recentRefills.reduce((total, refill) => total + refill.liters, 0)),
    refillAnomalies: recentRefills.filter((refill) => refill.status === 'anomaly').length,
    deviations: newestFirst(
      routeDeviationsApi(db).filter((deviation) => tripNos.has(deviation.tripNo)),
      (deviation) => deviation.detectedAt
    ).map((deviation) => ({
      no: deviation.no,
      tripNo: deviation.tripNo,
      deviationTypeName: deviation.deviationTypeName,
      detectedAt: deviation.detectedAt,
      nature: deviation.nature
    })),
    infractions: newestFirst(
      infractionsApi(db).filter((infraction) => infraction.driverNo === driverNo),
      (infraction) => infraction.occurredAt
    ).map((infraction) => ({
      no: infraction.no,
      infractionTypeName: infraction.infractionTypeName,
      occurredAt: infraction.occurredAt,
      status: infraction.status
    })),
    trainings: newestFirst(
      trainingsApi(db).filter((training) => training.employeeNo === driverNo),
      (training) => training.plannedOn ?? training.createdAt
    ).map((training) => ({
      no: training.no,
      topic: training.topic,
      plannedOn: training.plannedOn,
      status: training.status
    }))
  }
}

export function registerDriverActivityHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/fleet/drivers/:no/activity', { feature: 'DRIVER', action: 'read' }, (request) => {
    const no = routeParam(request, 'no')
    if (!driverEmployees(db).some((employee) => employee.no === no)) throw notFound()
    return ok(driverActivity(db, no, request))
  })
}
