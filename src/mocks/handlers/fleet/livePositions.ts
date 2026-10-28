import {
  expectedArrivals,
  lastReport,
  liveSituation,
  positionOnTrip,
  type TrackedStop,
  type TripFix
} from '@/modules/fleet/live-map/domain/livePosition'
import type { LivePositionApi } from '@/modules/fleet/live-map/types/liveMap.types'
import { plannedSchedule } from '@/modules/fleet/route-templates/domain/routeTemplate'
import { minutesBetween, nowIsoDateTime } from '@/utils/date'
import { circleContaining, type GeoPoint } from '@/utils/geo'
import type { MockDatabase } from '../../db/database'
import { DEAD_ZONES } from '../../fixtures/fleet/deadZones'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { activeLinks, employeeNames } from './links'
import { fleetSettings } from './settings'
import { sitesApi } from './sites'
import { vehicleStatuses } from './vehicleState'

/** Units that locate the vehicle; a vehicle without one in working order is not on the map. */
const LOCATING_EQUIPMENT = new Set(['GPS', 'OBC'])

/**
 * Where each tracked vehicle is now. Nothing is stored: the position follows from the trip on the
 * road and the clock, so the map tells the same story as the trip records.
 */
export function livePositions(db: MockDatabase): LivePositionApi[] {
  const now = nowIsoDateTime()
  const signalLossMin = fleetSettings(db).telematics.signalLossMin
  const statuses = vehicleStatuses(db)
  const links = activeLinks(db)
  const names = employeeNames(db)
  const sites = new Map(db.sites.all().map((site) => [site.no, site]))
  const areas = sitesApi(db)
    .filter((site) => site.active)
    .map((site) => ({ ...site, radiusM: site.effectiveRadiusM }))
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route.name]))
  const onTheRoad = db.trips.all().filter((trip) => trip.status === 'in_progress')
  const tracked = new Set(
    db.vehicleEquipment
      .all()
      .filter(
        (item) => LOCATING_EQUIPMENT.has(item.equipmentTypeNo) && item.state === 'operational'
      )
      .map((item) => item.vehicleNo)
  )

  return db.vehicles
    .all()
    .filter((vehicle) => tracked.has(vehicle.no) && !vehicle.removal)
    .map((vehicle) => {
      const trip = onTheRoad.find((row) => row.vehicleNo === vehicle.no)
      const status = statuses.get(vehicle.no)?.status
      const home = sites.get(vehicle.homeSiteNo)
      let stops: (TrackedStop & { siteName: string })[] = []
      let arrivals: string[] = []
      let track: (at: string) => GeoPoint = () => ({
        latitude: home?.latitude ?? 0,
        longitude: home?.longitude ?? 0
      })
      let fix: TripFix | null = null
      if (trip) {
        const schedule = plannedSchedule(trip.plannedDeparture, trip.stops)
        stops = trip.stops.map((stop, index) => {
          const site = sites.get(stop.siteNo)
          return {
            siteName: site?.name ?? stop.siteNo,
            latitude: site?.latitude ?? 0,
            longitude: site?.longitude ?? 0,
            plannedAt: schedule[index] ?? trip.plannedDeparture,
            passedAt: stop.passedAt,
            breakMin: stop.breakMin
          }
        })
        arrivals = expectedArrivals(stops)
        track = (at) => positionOnTrip(stops, arrivals, at)
        fix = positionOnTrip(stops, arrivals, now)
      }
      const report = lastReport(track, now, DEAD_ZONES)
      const signalLost = minutesBetween(report.at, now) >= signalLossMin
      const next = fix?.nextStop != null ? stops[fix.nextStop] : undefined
      const lastStop = stops.at(-1)
      const driverNo = trip?.driverNo ?? links.assignmentByVehicle.get(vehicle.no)?.employeeNo
      return {
        vehicleNo: vehicle.no,
        plate: vehicle.plate,
        driverName: driverNo ? (names.get(driverNo) ?? driverNo) : '',
        tripNo: trip?.no ?? null,
        routeName: trip ? (routes.get(trip.routeTemplateNo) ?? '') : '',
        situation: liveSituation({
          immobilized: status === 'immobilized' || status === 'out_of_service',
          signalLost,
          onTrip: !!trip,
          moving: !!fix && fix.speedKmh > 0
        }),
        ...report.position,
        speedKmh: signalLost ? 0 : (fix?.speedKmh ?? 0),
        reportedAt: report.at,
        placeName: circleContaining(report.position, areas)?.name ?? '',
        nextStopName: next?.siteName ?? '',
        nextStopExpectedAt: fix?.nextStop != null ? (arrivals[fix.nextStop] ?? null) : null,
        delayMin:
          lastStop && arrivals.length
            ? minutesBetween(lastStop.plannedAt, arrivals.at(-1) as string)
            : null,
        stops: stops.map((stop, index) => ({
          siteName: stop.siteName,
          latitude: stop.latitude,
          longitude: stop.longitude,
          plannedAt: stop.plannedAt,
          expectedAt: arrivals[index] ?? stop.plannedAt,
          passed: !!stop.passedAt
        }))
      }
    })
}

export function registerLivePositionsHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/fleet/live/positions', { feature: 'LIVEMAP', action: 'read' }, () =>
    ok(livePositions(db))
  )
}
