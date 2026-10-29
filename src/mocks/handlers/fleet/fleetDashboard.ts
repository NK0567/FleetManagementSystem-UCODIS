import type { AlertSeverity } from '@/modules/fleet/alerts/domain/alert'
import type { FleetDashboardApi } from '@/modules/fleet/dashboard/types/fleetDashboard.types'
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
import { statusReason, vehicleStatuses } from './vehicleState'

const LATEST_ALERTS = 8
const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }

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
    immobilized: vehicles
      .filter((vehicle) =>
        ['in_maintenance', 'immobilized', 'out_of_service'].includes(statusOf(vehicle.no))
      )
      .map((vehicle) => ({
        vehicleNo: vehicle.no,
        plate: vehicle.plate,
        status: statusOf(vehicle.no),
        reason: statusReason(statuses.get(vehicle.no)?.cause ?? null, vehicle, request.language)
      })),
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
