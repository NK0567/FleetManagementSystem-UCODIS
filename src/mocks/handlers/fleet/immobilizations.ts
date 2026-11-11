import {
  immobilizationCategory,
  type ImmobilizationCategory
} from '@/modules/fleet/vehicles/domain/vehicleStatus'
import { driverAvailability, driverIneligibility } from '@/modules/fleet/drivers/domain/driver'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { localize, type MockLanguage } from '../../i18n'
import { driverFacts, ineligibilityText } from './drivers'
import { activeLinks, employeeNames } from './links'
import { FLEET_MESSAGES } from './messages'
import { statusReason, vehicleStatuses } from './vehicleState'

export interface VehicleImmobilization {
  vehicleNo: string
  plate: string
  category: ImmobilizationCategory
  reason: string
}

/**
 * Every vehicle that cannot leave today, with the family of its cause. A technical or
 * administrative cause comes from the vehicle itself; a human one is a vehicle at rest whose
 * assigned driver is on leave, suspended or otherwise out (the driver on the road is not counted).
 */
export function vehicleImmobilizations(
  db: MockDatabase,
  language: MockLanguage
): VehicleImmobilization[] {
  const statuses = vehicleStatuses(db)
  const links = activeLinks(db)
  const names = employeeNames(db)
  const today = todayIso()
  const result: VehicleImmobilization[] = []
  for (const vehicle of db.vehicles.all().filter((row) => !row.removal)) {
    const state = statuses.get(vehicle.no)
    const category = immobilizationCategory(state?.cause ?? null)
    if (category && state) {
      result.push({
        vehicleNo: vehicle.no,
        plate: vehicle.plate,
        category,
        reason: statusReason(state.cause, vehicle, language)
      })
      continue
    }
    const assignment = links.assignmentByVehicle.get(vehicle.no)
    if (!assignment || state?.status === 'in_mission') continue
    const employee = db.employees.find(assignment.employeeNo)
    if (!employee) continue
    const facts = driverFacts(db, employee, today)
    const availability = driverAvailability(facts)
    if (availability !== 'unavailable' && availability !== 'on_leave') continue
    result.push({
      vehicleNo: vehicle.no,
      plate: vehicle.plate,
      category: 'human',
      reason: localize(language, FLEET_MESSAGES.causeDriverOut, {
        driver: names.get(assignment.employeeNo) ?? assignment.employeeNo,
        reasons: ineligibilityText(language, driverIneligibility(facts))
      })
    })
  }
  return result
}
