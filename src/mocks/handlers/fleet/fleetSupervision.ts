import type {
  FleetPark,
  FleetSupervision,
  SupervisedVehicle
} from '@/modules/fleet/dashboard/types/fleetDashboard.types'
import { averageAgeYears } from '@/modules/fleet/dashboard/domain/park'
import type { LivePositionApi } from '@/modules/fleet/live-map/types/liveMap.types'
import { isUsable } from '@/modules/fleet/vehicles/domain/vehicleStatus'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { reportingSettings } from './settings'
import { vehicleStatuses } from './vehicleState'

/**
 * The control room board (FLT04-US05): the tracked vehicles on a mission, standing still, in
 * alert and out of their zone, each one a click away from the map.
 */
export function fleetSupervision(positions: readonly LivePositionApi[]): FleetSupervision {
  const row = (position: LivePositionApi): SupervisedVehicle => ({
    vehicleNo: position.vehicleNo,
    plate: position.plate,
    driverName: position.driverName,
    tripNo: position.tripNo,
    situation: position.situation,
    placeName: position.placeName,
    nextStopName: position.nextStopName,
    speedKmh: position.speedKmh,
    alertCount: position.alertCount,
    corridorGapM: position.corridorGapM
  })
  return {
    onMission: positions.filter((position) => position.tripNo).map(row),
    stopped: positions
      .filter((position) => position.situation === 'stopped' || position.situation === 'parked')
      .map(row),
    inAlert: positions.filter((position) => position.alertCount > 0).map(row),
    outOfZone: positions.filter((position) => position.outOfZone).map(row)
  }
}

/** The park at a glance (FLT07-US01): ready, on a mission, held, its availability and its age. */
export function fleetPark(db: MockDatabase): FleetPark {
  const statuses = vehicleStatuses(db)
  const vehicles = db.vehicles.all().filter((vehicle) => !vehicle.removal)
  const statusOf = (no: string) => statuses.get(no)?.status ?? 'available'
  const count = (test: (status: ReturnType<typeof statusOf>) => boolean) =>
    vehicles.filter((vehicle) => test(statusOf(vehicle.no))).length
  const usable = count(isUsable)
  return {
    total: vehicles.length,
    available: count((status) => status === 'available' || status === 'assigned'),
    onMission: count((status) => status === 'in_mission'),
    immobilized: count((status) => !isUsable(status)),
    availabilityRate: vehicles.length ? Math.round((usable * 1000) / vehicles.length) / 10 : null,
    availabilityTargetPct: reportingSettings(db).availabilityTargetPct,
    averageAgeYears: averageAgeYears(vehicles, todayIso())
  }
}
