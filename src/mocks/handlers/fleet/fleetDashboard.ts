import type { AlertSeverity } from '@/modules/fleet/alerts/domain/alert'
import { IMMOBILIZATION_CATEGORIES } from '@/modules/fleet/vehicles/domain/vehicleStatus'
import type {
  DashboardDaily,
  FleetDashboardApi
} from '@/modules/fleet/dashboard/types/fleetDashboard.types'
import type { TripRow } from '../../fixtures/fleet/trips'
import { averageLitersPer100 } from '@/modules/fleet/fuel-consumption/domain/consumption'
import { LIVE_SITUATIONS } from '@/modules/fleet/live-map/domain/livePosition'
import { VEHICLE_STATUSES } from '@/modules/fleet/vehicles/types/vehicle.types'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { alertsApi } from './alerts'
import { documentsApi, missingDocumentsApi } from './documents'
import { driverScoresApi } from './driverScores'
import { driversApi } from './drivers'
import { fuelConsumptionApi } from './fuelConsumption'
import { fuelRefillsApi } from './fuelRefills'
import { infractionsApi } from './infractions'
import { detectRouteDeviations } from './deviationDetection'
import { fleetPark, fleetSupervision } from './fleetSupervision'
import { livePositions, simulatedNow } from './livePositions'
import { deviationSummary } from './routeDeviations'
import { vehicleImmobilizations } from './immobilizations'
import { vehicleStatuses } from './vehicleState'

const LATEST_ALERTS = 8
const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }

const inPeriod = (iso: string | null | undefined, prefix: string) => !!iso && iso.startsWith(prefix)

/** Kilometres run by a trip: the odometer when it is over, else the share of the route passed. */
function tripKm(trip: TripRow): number {
  if (trip.startOdometerKm !== null && trip.endOdometerKm !== null) {
    return Math.max(0, trip.endOdometerKm - trip.startOdometerKm)
  }
  const total = trip.stops.length || 1
  return Math.round((trip.referenceKm * trip.stops.filter((stop) => stop.passedAt).length) / total)
}

function dailyFigures(db: MockDatabase, today: string): DashboardDaily {
  const month = today.slice(0, 7)
  const trips = db.trips.all().filter((trip) => trip.status !== 'cancelled')
  const orders = db.transportOrders.all()
  const tripKg = (trip: TripRow) =>
    orders
      .filter((order) => order.tripNo === trip.no)
      .flatMap((order) => order.lines)
      .reduce((total, line) => total + (line.weightKg ?? 0), 0)
  const sum = (prefix: string, value: (trip: TripRow) => number) =>
    trips
      .filter((trip) => inPeriod(trip.actualDeparture, prefix))
      .reduce((total, trip) => total + value(trip), 0)
  const refills = db.fuelRefills.all()
  const liters = (prefix: string) =>
    Math.round(
      refills
        .filter((refill) => inPeriod(refill.refueledAt, prefix))
        .reduce((total, refill) => total + refill.liters, 0)
    )
  const claims = db.claims.all()
  const claimCount = (nature: 'accident' | 'incident', prefix: string) =>
    claims.filter((claim) => claim.nature === nature && inPeriod(claim.occurredAt, prefix)).length
  const stops = (prefix: string) =>
    db.routeDeviations
      .all()
      .filter(
        (deviation) =>
          deviation.deviationTypeNo === 'UNPLANNED-STOP' && inPeriod(deviation.detectedAt, prefix)
      ).length +
    db.telematicsEvents
      .all()
      .filter((event) => event.eventTypeNo === 'LONG-STOP' && inPeriod(event.occurredAt, prefix))
      .length
  const tonnes = (prefix: string) => Math.round(sum(prefix, tripKg) / 100) / 10
  return {
    distanceKm: sum(today, tripKm),
    distanceKmMonth: sum(month, tripKm),
    transportedTonnes: tonnes(today),
    transportedTonnesMonth: tonnes(month),
    fuelLiters: liters(today),
    fuelLitersMonth: liters(month),
    accidents: claimCount('accident', today),
    accidentsMonth: claimCount('accident', month),
    incidents: claimCount('incident', today),
    incidentsMonth: claimCount('incident', month),
    unauthorizedStops: stops(today),
    unauthorizedStopsMonth: stops(month)
  }
}

export function fleetDashboard(db: MockDatabase, request: MockRequest): FleetDashboardApi {
  const month = todayIso().slice(0, 7)
  const statuses = vehicleStatuses(db)
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
  const vehicles = db.vehicles.all().filter((vehicle) => !vehicle.removal)
  const statusOf = (no: string) => statuses.get(no)?.status ?? 'available'
  const ready = (no: string) => ['available', 'assigned'].includes(statusOf(no))
  const ofRole = (role: 'tows' | 'towed') =>
    vehicles.filter((vehicle) => types.get(vehicle.vehicleTypeNo)?.couplingRole === role)
  const availability = (rows: { no: string }[]) => ({
    available: rows.filter((row) => ready(row.no)).length,
    total: rows.length
  })

  const documents = documentsApi(db).filter((document) => document.current && document.mandatory)
  const positions = livePositions(db, request)
  const refills = fuelRefillsApi(db, request.language).filter((refill) =>
    refill.refueledAt.startsWith(month)
  )
  const drivers = driversApi(db, request.language)
  const heldBack = vehicleImmobilizations(db, request.language)

  return {
    supervision: fleetSupervision(positions),
    park: fleetPark(db),
    availability: {
      tractors: availability(ofRole('tows')),
      trailers: availability(ofRole('towed')),
      drivers: {
        available: drivers.filter((driver) => driver.availability === 'available').length,
        total: drivers.length
      }
    },
    documents: {
      expired: documents.filter((document) => document.state === 'expired').length,
      expiring: documents.filter((document) => document.state === 'expiring').length,
      missing: missingDocumentsApi(db).filter((gap) => gap.reason === 'missing').length
    },
    movement: Object.fromEntries(
      LIVE_SITUATIONS.map((situation) => [
        situation,
        positions.filter((position) => position.situation === situation).length
      ])
    ) as FleetDashboardApi['movement'],
    latestAlerts: alertsApi(db, request)
      .filter((alert) => alert.status !== 'resolved')
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.since.localeCompare(a.since)
      )
      .slice(0, LATEST_ALERTS)
      .map(({ no, category, severity, subject, detail, since, path, recordNo }) => ({
        no,
        category,
        severity,
        subject,
        detail,
        since,
        path,
        recordNo
      })),
    immobilized: heldBack.map((item) => ({
      vehicleNo: item.vehicleNo,
      plate: item.plate,
      status: statusOf(item.vehicleNo),
      category: item.category,
      reason: item.reason
    })),
    immobilizedByCategory: Object.fromEntries(
      IMMOBILIZATION_CATEGORIES.map((category) => [
        category,
        heldBack.filter((item) => item.category === category).length
      ])
    ) as FleetDashboardApi['immobilizedByCategory'],
    unavailableDrivers: drivers
      .filter((driver) => ['unavailable', 'on_leave'].includes(driver.availability))
      .map((driver) => ({
        driverNo: driver.no,
        fullName: driver.fullName,
        availability: driver.availability,
        reason: driver.ineligibilityReasons
      })),
    daily: dailyFigures(db, todayIso()),
    fleetByStatus: VEHICLE_STATUSES.map((status) => ({
      status,
      count: vehicles.filter((vehicle) => statusOf(vehicle.no) === status).length
    })).filter((item) => item.count > 0),
    fuelThisMonth: {
      liters: Math.round(refills.reduce((total, refill) => total + refill.liters, 0)),
      amount: refills.reduce((total, refill) => total + refill.amount, 0),
      averageL100: averageLitersPer100(
        fuelConsumptionApi(db).filter((period) => period.to.startsWith(month))
      )
    },
    compliance: {
      tripComplianceRate: deviationSummary(db).complianceRate,
      openInfractions: infractionsApi(db).filter((infraction) => infraction.status !== 'closed')
        .length,
      driversBelowScore: driverScoresApi(db).filter((score) => score.belowThreshold).length
    }
  }
}

export function registerFleetDashboardHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/fleet/dashboard', { feature: 'FLEETDASHBOARD', action: 'read' }, (request) => {
    // The board shows the vehicles in alert: what the trips show against their course counts.
    detectRouteDeviations(db, simulatedNow())
    return ok(fleetDashboard(db, request))
  })
}
