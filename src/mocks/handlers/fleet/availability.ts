import {
  driverIneligibility,
  type IneligibilityReason
} from '@/modules/fleet/drivers/domain/driver'
import {
  OPEN_TRIP_STATUSES,
  windowsOverlap,
  type TimeWindow
} from '@/modules/fleet/trips/domain/trip'
import type {
  AvailabilityApi,
  ResourceAvailabilityApi
} from '@/modules/fleet/trips/types/availability.types'
import { combinationCapacity } from '@/modules/fleet/vehicles/domain/capacity'
import { isUsable, type VehicleStatusResult } from '@/modules/fleet/vehicles/domain/vehicleStatus'
import type { MockDatabase } from '../../db/database'
import type { EmployeeRow } from '../../fixtures/hr/employees'
import { badRequest, conflict, unprocessable, type MockHttpError } from '../../http/errors'
import { readDateTime } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import {
  localize,
  toMockLanguage,
  type LocalizedText,
  type MessageParams,
  type MockLanguage
} from '../../i18n'
import { driverEmployees, driverFacts, ineligibilityText, isOnLeave } from './drivers'
import { employeeNames, vehiclePlates } from './links'
import { FLEET_MESSAGES } from './messages'
import { tripWindow } from './tripIndex'
import { statusReason, vehicleStatuses } from './vehicleState'

export type VehicleRole = 'motorized' | 'towed'

/** Why a vehicle or a driver cannot take a trip over a time window. */
export type Unavailability =
  | { code: 'not_motorized' }
  | { code: 'not_a_trailer' }
  | { code: 'unusable'; plate: string; reason: string }
  | { code: 'ineligible'; reasons: IneligibilityReason[] }
  | { code: 'busy'; name: string; tripNo: string }

function messageOf(
  language: MockLanguage,
  item: Unavailability
): { text: LocalizedText; params: MessageParams } {
  switch (item.code) {
    case 'not_motorized':
      return { text: FLEET_MESSAGES.notMotorized, params: {} }
    case 'not_a_trailer':
      return { text: FLEET_MESSAGES.notATrailer, params: {} }
    case 'unusable':
      return {
        text: FLEET_MESSAGES.vehicleNotUsable,
        params: { plate: item.plate, reason: item.reason }
      }
    case 'ineligible':
      return {
        text: FLEET_MESSAGES.driverNotEligible,
        params: { reasons: ineligibilityText(language, item.reasons) }
      }
    case 'busy':
      return { text: FLEET_MESSAGES.resourceBusy, params: { name: item.name, no: item.tripNo } }
  }
}

export function unavailabilityText(language: MockLanguage, item: Unavailability): string {
  const { text, params } = messageOf(language, item)
  return localize(language, text, params)
}

/** A taken resource is a conflict; anything else makes the request itself wrong. */
export function unavailabilityError(language: MockLanguage, item: Unavailability): MockHttpError {
  const { text, params } = messageOf(language, item)
  return item.code === 'busy' ? conflict(text, params) : unprocessable(text, params)
}

/** Each calendar day the window touches; an open window only its first day. */
function daysOf(window: TimeWindow): string[] {
  const first = window.start.slice(0, 10)
  const last = (window.end ?? window.start).slice(0, 10)
  const days: string[] = []
  for (let day = new Date(`${first}T00:00:00Z`); ; day.setUTCDate(day.getUTCDate() + 1)) {
    const iso = day.toISOString().slice(0, 10)
    if (iso > last) break
    days.push(iso)
  }
  return days
}

/** Open trips overlapping the window, other than the one being planned. */
function overlappingTrips(db: MockDatabase, window: TimeWindow, except?: string) {
  return db.trips
    .all()
    .filter(
      (trip) =>
        trip.no !== except &&
        OPEN_TRIP_STATUSES.includes(trip.status) &&
        windowsOverlap(window, tripWindow(trip))
    )
}

/**
 * The one availability check of the application, shared by the fleet when it plans a trip and by
 * transport planning when it picks the means of an order: fit for the road, right kind, and not
 * held by another trip over the same time window.
 */
export function createAvailability(db: MockDatabase, window: TimeWindow, language: MockLanguage) {
  let statuses: Map<string, VehicleStatusResult> | null = null
  const plates = vehiclePlates(db)
  const names = employeeNames(db)

  function vehicleUnavailability(
    vehicleNo: string,
    role: VehicleRole,
    except?: string
  ): Unavailability[] {
    const vehicle = db.vehicles.findOrFail(vehicleNo)
    const type = db.vehicleTypes.findOrFail(vehicle.vehicleTypeNo)
    const items: Unavailability[] = []
    if (role === 'motorized' && !type.motorized) items.push({ code: 'not_motorized' })
    if (role === 'towed' && type.couplingRole !== 'towed') items.push({ code: 'not_a_trailer' })
    statuses ??= vehicleStatuses(db)
    const status = statuses.get(vehicle.no)
    if (status && !isUsable(status.status)) {
      items.push({
        code: 'unusable',
        plate: vehicle.plate,
        reason: statusReason(status.cause, vehicle, language)
      })
    }
    const held = overlappingTrips(db, window, except).find(
      (trip) => trip.vehicleNo === vehicleNo || trip.trailerNo === vehicleNo
    )
    if (held) items.push({ code: 'busy', name: vehicle.plate, tripNo: held.no })
    return items
  }

  function driverUnavailability(employee: EmployeeRow, except?: string): Unavailability[] {
    const days = daysOf(window)
    const facts = driverFacts(db, employee, days[0] ?? window.start.slice(0, 10))
    // Leave counts on every day of the trip, not only on the day it leaves.
    const reasons = driverIneligibility({
      ...facts,
      onLeave: days.some((day) => isOnLeave(db, employee, day))
    })
    const items: Unavailability[] = reasons.length ? [{ code: 'ineligible', reasons }] : []
    const held = overlappingTrips(db, window, except).find((trip) => trip.driverNo === employee.no)
    if (held) {
      items.push({ code: 'busy', name: names.get(employee.no) ?? employee.no, tripNo: held.no })
    }
    return items
  }

  return {
    vehicleUnavailability,
    driverUnavailability: (employeeNo: string, except?: string) =>
      driverUnavailability(db.employees.findOrFail(employeeNo), except),
    plates,
    names,
    drivers: () => driverEmployees(db)
  }
}

/** The driver assigned to a vehicle on a given day, if any. */
function assignedDriver(db: MockDatabase, vehicleNo: string, at: string): string | null {
  const day = at.slice(0, 10)
  const assignment = db.driverAssignments
    .all()
    .find(
      (row) =>
        row.vehicleNo === vehicleNo && row.startDate <= day && (!row.endDate || row.endDate >= day)
    )
  return assignment?.employeeNo ?? null
}

/** Every vehicle and driver of the park, with whether it is free over the window and why not. */
export function availabilityOver(
  db: MockDatabase,
  window: TimeWindow,
  language: MockLanguage
): Pick<AvailabilityApi, 'vehicles' | 'drivers'> {
  const availability = createAvailability(db, window, language)
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
  const vehicles: ResourceAvailabilityApi[] = []
  for (const vehicle of db.vehicles.all()) {
    const type = types.get(vehicle.vehicleTypeNo)
    if (!type || vehicle.removal) continue
    const role: VehicleRole | null = type.motorized
      ? 'motorized'
      : type.couplingRole === 'towed'
        ? 'towed'
        : null
    if (!role) continue
    const items = availability.vehicleUnavailability(vehicle.no, role)
    const reasons = items.map((item) => unavailabilityText(language, item))
    vehicles.push({
      no: vehicle.no,
      label: vehicle.plate,
      role,
      capacity: combinationCapacity(
        {
          carriesGoods: type.carriesGoods,
          maxLoadKg: vehicle.maxLoadKg,
          maxVolumeM3: vehicle.maxVolumeM3,
          totalCapacityL: vehicle.compartments.reduce((total, item) => total + item.volumeL, 0)
        },
        null
      ),
      available: reasons.length === 0,
      reasons,
      busyOnly: items.length > 0 && items.every((item) => item.code === 'busy'),
      assignedDriverNo: role === 'motorized' ? assignedDriver(db, vehicle.no, window.start) : null
    })
  }
  const drivers = availability.drivers().map((employee): ResourceAvailabilityApi => {
    const items = availability.driverUnavailability(employee.no)
    const reasons = items.map((item) => unavailabilityText(language, item))
    return {
      no: employee.no,
      label: availability.names.get(employee.no) ?? employee.no,
      role: 'driver',
      capacity: null,
      available: reasons.length === 0,
      reasons,
      busyOnly: items.length > 0 && items.every((item) => item.code === 'busy')
    }
  })
  return { vehicles, drivers }
}

export function registerAvailabilityHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/fleet/availability', { feature: 'TRIP', action: 'read' }, (request) => {
    const from = readDateTime(request.query, 'from', { required: true }) ?? ''
    const to = readDateTime(request.query, 'to', { required: true }) ?? ''
    if (to < from) throw badRequest(FLEET_MESSAGES.windowEndBeforeStart)
    const result: AvailabilityApi = {
      from,
      to,
      ...availabilityOver(db, { start: from, end: to }, toMockLanguage(request.language))
    }
    return ok(result)
  })
}
