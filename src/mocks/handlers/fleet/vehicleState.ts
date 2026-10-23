import {
  vehicleStatus,
  type VehicleStatusCause,
  type VehicleStatusFacts,
  type VehicleStatusResult
} from '@/modules/fleet/vehicles/domain/vehicleStatus'
import type { MockDatabase } from '../../db/database'
import type { VehicleRow } from '../../fixtures/fleet/vehicles'
import { localize, localizeDay, type MockLanguage } from '../../i18n'
import { FLEET_MESSAGES } from './messages'

function factsOf(vehicle: VehicleRow): VehicleStatusFacts {
  return {
    removed: vehicle.removal !== null,
    outOfServiceReason: vehicle.outOfService?.reason ?? null,
    immobilizations: [],
    activeTripNo: null,
    driverName: null,
    coupledPlate: null
  }
}

/** Status of every vehicle, from the facts each fleet record contributes. */
export function vehicleStatuses(db: MockDatabase): Map<string, VehicleStatusResult> {
  return new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicleStatus(factsOf(vehicle))]))
}

export function statusReason(
  cause: VehicleStatusCause | null,
  vehicle: VehicleRow,
  language: MockLanguage
): string {
  if (!cause) return ''
  switch (cause.kind) {
    case 'removed':
      return localize(language, FLEET_MESSAGES.causeRemoved, {
        date: localizeDay(vehicle.removal?.date ?? '')
      })
    case 'out_of_service':
      return localize(language, FLEET_MESSAGES.causeOutOfService, { detail: cause.detail })
    case 'document':
      return localize(language, FLEET_MESSAGES.causeDocument, { detail: cause.detail })
    case 'inspection':
      return localize(language, FLEET_MESSAGES.causeInspection, { detail: cause.detail })
    case 'maintenance':
      return localize(language, FLEET_MESSAGES.causeMaintenance, { detail: cause.detail })
    case 'trip':
      return localize(language, FLEET_MESSAGES.causeTrip, { detail: cause.detail })
    case 'driver':
      return localize(language, FLEET_MESSAGES.causeDriver, { detail: cause.detail })
    case 'coupling':
      return localize(language, FLEET_MESSAGES.causeCoupling, { detail: cause.detail })
  }
}
