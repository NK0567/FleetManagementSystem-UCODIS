import {
  vehicleStatus,
  type VehicleStatusCause,
  type VehicleStatusFacts,
  type VehicleStatusResult
} from '@/modules/fleet/vehicles/domain/vehicleStatus'
import type { MockDatabase } from '../../db/database'
import type { VehicleRow } from '../../fixtures/fleet/vehicles'
import { localize, localizeDay, type MockLanguage } from '../../i18n'
import { activeLinks, coupledWith, employeeNames, vehiclePlates } from './links'
import { openDowntimeCauses } from '../maintenance/downtimes'
import { blockingServiceCauses } from '../maintenance/serviceDue'
import { FLEET_MESSAGES } from './messages'
import { tripIndex } from './tripIndex'
import { documentCompliance, invalidatingGaps } from './documentCompliance'
import { vehiclesAwaitingRecheck } from './inspections'

/** Status of every vehicle, from the facts each fleet record contributes. */
export function vehicleStatuses(db: MockDatabase): Map<string, VehicleStatusResult> {
  const links = activeLinks(db)
  const names = employeeNames(db)
  const plates = vehiclePlates(db)
  const trips = tripIndex(db)
  const compliance = documentCompliance(db).vehicles
  const typeNames = new Map(db.documentTypes.all().map((type) => [type.no, type.name]))
  const rechecks = vehiclesAwaitingRecheck(db)
  const downtimes = openDowntimeCauses(db)
  const services = blockingServiceCauses(db)
  const factsOf = (vehicle: VehicleRow): VehicleStatusFacts => {
    const assignment = links.assignmentByVehicle.get(vehicle.no)
    const coupling = links.couplingByVehicle.get(vehicle.no)
    return {
      removed: vehicle.removal !== null,
      outOfServiceReason: vehicle.outOfService?.reason ?? null,
      immobilizations: [
        ...invalidatingGaps(compliance.get(vehicle.no) ?? []).map((gap) => ({
          kind: 'document' as const,
          detail: typeNames.get(gap.documentTypeNo) ?? gap.documentTypeNo
        })),
        ...[rechecks.get(vehicle.no)]
          .filter((inspection) => !!inspection)
          .map((inspection) => ({ kind: 'inspection' as const, detail: inspection.findings })),
        ...(downtimes.get(vehicle.no) ?? []).map((detail) => ({
          kind: 'maintenance' as const,
          detail
        })),
        ...(services.get(vehicle.no) ?? []).map((detail) => ({ kind: 'service' as const, detail }))
      ],
      activeTripNo: trips.onRoadByVehicle.get(vehicle.no)?.no ?? null,
      driverName: assignment ? (names.get(assignment.employeeNo) ?? assignment.employeeNo) : null,
      coupledPlate: coupling ? (plates.get(coupledWith(coupling, vehicle.no)) ?? null) : null
    }
  }
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
    case 'service':
      return localize(language, FLEET_MESSAGES.causeService, { detail: cause.detail })
    case 'trip':
      return localize(language, FLEET_MESSAGES.causeTrip, { detail: cause.detail })
    case 'driver':
      return localize(language, FLEET_MESSAGES.causeDriver, { detail: cause.detail })
    case 'coupling':
      return localize(language, FLEET_MESSAGES.causeCoupling, { detail: cause.detail })
  }
}
