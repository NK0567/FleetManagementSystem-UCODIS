import { demoDayOffset } from '../clock'
import { moduleTogglesCollection } from '../fixtures/settings/moduleToggles'
import { orgUnitsCollection } from '../fixtures/hr/orgUnits'
import { employeeCategoriesCollection } from '../fixtures/hr/employeeCategories'
import { leaveTypesCollection } from '../fixtures/hr/leaveTypes'
import { jobPositionsCollection } from '../fixtures/hr/jobPositions'
import { publicHolidaysCollection, workingCalendarCollection } from '../fixtures/hr/calendar'
import { employeesCollection } from '../fixtures/hr/employees'
import { leaveBalanceAdjustmentsCollection, leaveRequestsCollection } from '../fixtures/hr/leave'
import { fleetSettingsCollection } from '../fixtures/fleet/settings'
import { vehicleTypesCollection } from '../fixtures/fleet/vehicleTypes'
import { equipmentTypesCollection } from '../fixtures/fleet/equipmentTypes'
import { siteTypesCollection } from '../fixtures/fleet/siteTypes'
import { sitesCollection } from '../fixtures/fleet/sites'
import { providersCollection } from '../fixtures/fleet/providers'
import { vehiclesCollection } from '../fixtures/fleet/vehicles'
import { vehicleEquipmentCollection } from '../fixtures/fleet/vehicleEquipment'
import { couplingsCollection } from '../fixtures/fleet/couplings'
import { driverAssignmentsCollection } from '../fixtures/fleet/driverAssignments'
import { routeTemplatesCollection } from '../fixtures/fleet/routeTemplates'
import { tripsCollection } from '../fixtures/fleet/trips'
import {
  fleetStatusArchivesCollection,
  fleetStatusNotesCollection
} from '../fixtures/fleet/fleetStatus'
import { createCollection, type CollectionContext } from './collection'
import { clearStoredCollections } from './storage'

/** Bump when fixtures change shape: every collection is then reseeded. */
export const MOCK_SEED_VERSION = 4

export function createDatabase(
  context: CollectionContext = {
    seedVersion: MOCK_SEED_VERSION,
    dayOffset: demoDayOffset()
  }
) {
  const collections = {
    moduleToggles: createCollection(moduleTogglesCollection, context),
    orgUnits: createCollection(orgUnitsCollection, context),
    employeeCategories: createCollection(employeeCategoriesCollection, context),
    leaveTypes: createCollection(leaveTypesCollection, context),
    jobPositions: createCollection(jobPositionsCollection, context),
    workingCalendar: createCollection(workingCalendarCollection, context),
    publicHolidays: createCollection(publicHolidaysCollection, context),
    employees: createCollection(employeesCollection, context),
    leaveRequests: createCollection(leaveRequestsCollection, context),
    leaveBalanceAdjustments: createCollection(leaveBalanceAdjustmentsCollection, context),
    fleetSettings: createCollection(fleetSettingsCollection, context),
    vehicleTypes: createCollection(vehicleTypesCollection, context),
    equipmentTypes: createCollection(equipmentTypesCollection, context),
    siteTypes: createCollection(siteTypesCollection, context),
    sites: createCollection(sitesCollection, context),
    providers: createCollection(providersCollection, context),
    vehicles: createCollection(vehiclesCollection, context),
    vehicleEquipment: createCollection(vehicleEquipmentCollection, context),
    couplings: createCollection(couplingsCollection, context),
    driverAssignments: createCollection(driverAssignmentsCollection, context),
    routeTemplates: createCollection(routeTemplatesCollection, context),
    trips: createCollection(tripsCollection, context),
    fleetStatusNotes: createCollection(fleetStatusNotesCollection, context),
    fleetStatusArchives: createCollection(fleetStatusArchivesCollection, context)
  }

  return {
    ...collections,
    reset(): void {
      clearStoredCollections()
      for (const collection of Object.values(collections)) collection.reset()
    }
  }
}

export type MockDatabase = ReturnType<typeof createDatabase>
