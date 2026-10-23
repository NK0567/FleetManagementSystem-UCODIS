import { driverIneligibility } from '@/modules/fleet/drivers/domain/driver'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { isUsable } from '@/modules/fleet/vehicles/domain/vehicleStatus'
import type { ReferenceItem } from '@/types/reference.types'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { driverEmployees, driverFacts } from './drivers'
import { vehicleStatuses } from './vehicleState'

type VehicleKind = 'tows' | 'towed' | 'motorized'

/** Vehicles still in the fleet, by kind; only usable ones may be picked. */
function vehiclesOfKind(db: MockDatabase, kind: VehicleKind): ReferenceItem[] {
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
  const statuses = vehicleStatuses(db)
  const matches = (typeNo: string) => {
    const type = types.get(typeNo)
    return kind === 'motorized' ? !!type?.motorized : type?.couplingRole === kind
  }
  return db.vehicles
    .all()
    .filter((vehicle) => !vehicle.removal && matches(vehicle.vehicleTypeNo))
    .map((vehicle) => {
      const status = statuses.get(vehicle.no)?.status ?? 'available'
      return {
        code: vehicle.no,
        description: `${vehicle.plate} · ${vehicle.make} ${vehicle.model}`,
        active: isUsable(status)
      }
    })
}

/** Fleet lists served by GET /reference/all for selects, lookups and filters. */
export function fleetReferenceData(db: MockDatabase): Record<string, ReferenceItem[]> {
  return {
    vehicleTypes: db.vehicleTypes
      .all()
      .map((type) => ({ code: type.no, description: type.name, active: type.active })),
    equipmentTypes: db.equipmentTypes
      .all()
      .map((type) => ({ code: type.no, description: type.name, active: type.active })),
    siteTypes: db.siteTypes
      .all()
      .map((type) => ({ code: type.no, description: type.name, active: type.active })),
    sites: db.sites
      .all()
      .map((site) => ({ code: site.no, description: site.name, active: site.active })),
    tractors: vehiclesOfKind(db, 'tows'),
    trailers: vehiclesOfKind(db, 'towed'),
    motorizedVehicles: vehiclesOfKind(db, 'motorized'),
    drivers: driverEmployees(db).map((employee) => ({
      code: employee.no,
      description: employeeFullName(employee),
      active: driverIneligibility(driverFacts(db, employee, todayIso())).length === 0
    })),
    routeTemplates: db.routeTemplates
      .all()
      .map((route) => ({ code: route.no, description: route.name, active: route.active })),
    providers: db.providers.all().map((provider) => ({
      code: provider.no,
      description: provider.name,
      active: provider.authorized
    }))
  }
}
