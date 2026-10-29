import { consumptionReference } from '@/modules/fleet/fuel-consumption/domain/consumption'
import {
  distanceDrivenKm,
  engineRunning,
  positionOnTrip
} from '@/modules/fleet/live-map/domain/livePosition'
import type {
  OnboardFaultCode,
  OnboardReading,
  OnboardReadingsApi
} from '@/modules/fleet/live-map/types/liveMap.types'
import { addMinutes } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import {
  DEFAULT_ONBOARD_PROFILE,
  ONBOARD_PROFILES,
  READING_COUNT,
  READING_STEP_MIN,
  RESERVE_FUEL_PCT
} from '../../fixtures/fleet/onboardReadings'
import type { TripRow } from '../../fixtures/fleet/trips'
import type { VehicleRow } from '../../fixtures/fleet/vehicles'
import { vehicleReference } from './fuelReferences'
import { fleetSettings } from './settings'
import { telematicsEventsApi } from './telematicsEvents'
import { tripTrack } from './tripTracking'

/** A fault code as the unit sends it, inside the detail of the event (« Code P0087 : … »). */
const OBD_CODE = /\b[PCBU][0-9A-F]{4}\b/

/**
 * Reads the on-board computer of a vehicle at any moment: the engine and the gauge follow the
 * trip on the road (litres burnt at its reference consumption), the odometer adds the kilometres
 * driven since its last reading. Nothing is stored, so the readings tell the same story as the map.
 */
export function onboardReader(
  db: MockDatabase,
  vehicle: VehicleRow,
  trip: TripRow | undefined
): (at: string) => OnboardReading {
  const profile = ONBOARD_PROFILES[vehicle.no] ?? DEFAULT_ONBOARD_PROFILE
  const tank = vehicle.tankCapacityL
  const lastReadingAt = vehicle.odometerReadings.reduce(
    (latest, reading) => (reading.readAt > latest ? reading.readAt : latest),
    ''
  )
  if (!trip || !trip.actualDeparture) {
    return (at) => ({
      at,
      odometerKm: vehicle.odometerKm,
      fuelLevelPct: tank ? profile.fuelPct : null,
      engineOn: profile.runningWhileParked,
      speedKmh: 0
    })
  }
  const departure = trip.actualDeparture
  const { stops, arrivals } = tripTrack(db, trip)
  const route = db.routeTemplates.find(trip.routeTemplateNo)
  const l100 = consumptionReference(
    vehicleReference(db.fuelReferences.all(), vehicle.no, trip.routeTemplateNo)?.referenceL100 ??
      null,
    route?.fuelReferenceL100 ?? null,
    db.vehicleTypes.find(vehicle.vehicleTypeNo)?.fuelReferenceL100 ?? null,
    fleetSettings(db).fuel.defaultL100
  ).value
  const odometerFrom = lastReadingAt > departure ? lastReadingAt : departure
  return (at) => {
    const driven = at > departure ? distanceDrivenKm(stops, arrivals, departure, at) : 0
    const sinceReading = at > odometerFrom ? distanceDrivenKm(stops, arrivals, odometerFrom, at) : 0
    const burntPct = tank ? ((driven * l100) / 100 / tank) * 100 : 0
    return {
      at,
      odometerKm: Math.round(vehicle.odometerKm + sinceReading),
      fuelLevelPct: tank
        ? Math.max(RESERVE_FUEL_PCT, Math.round(profile.fuelPct - burntPct))
        : null,
      engineOn: at >= departure && engineRunning(stops, arrivals, at, profile.idleAtStopMin),
      speedKmh: at >= departure ? positionOnTrip(stops, arrivals, at).speedKmh : 0
    }
  }
}

/** The idle minutes allowed to the driver of a vehicle at a stop. */
export function idleAtStopMin(vehicleNo: string): number {
  return (ONBOARD_PROFILES[vehicleNo] ?? DEFAULT_ONBOARD_PROFILE).idleAtStopMin
}

/** Engine fault codes the units of the vehicle sent and nobody has taken in hand yet. */
export function openFaultCodes(db: MockDatabase, vehicleNo: string): OnboardFaultCode[] {
  return telematicsEventsApi(db)
    .filter(
      (event) => event.vehicleNo === vehicleNo && event.family === 'fault' && event.status === 'new'
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .map((event) => ({
      eventNo: event.no,
      code: OBD_CODE.exec(event.detail)?.[0] ?? event.eventTypeName,
      occurredAt: event.occurredAt
    }))
}

/** The last readings of a vehicle, newest first, up to the moment its unit last reported. */
export function onboardReadings(
  db: MockDatabase,
  vehicle: VehicleRow,
  trip: TripRow | undefined,
  lastReportAt: string | null,
  signalLost: boolean
): OnboardReadingsApi {
  const base = {
    vehicleNo: vehicle.no,
    plate: vehicle.plate,
    faultCodes: openFaultCodes(db, vehicle.no)
  }
  if (!lastReportAt) {
    return { ...base, tracked: false, signalLost: false, current: null, readings: [] }
  }
  const read = onboardReader(db, vehicle, trip)
  const readings = Array.from({ length: READING_COUNT }, (_, index) =>
    read(addMinutes(lastReportAt, -index * READING_STEP_MIN))
  )
  return { ...base, tracked: true, signalLost, current: readings[0] ?? null, readings }
}
