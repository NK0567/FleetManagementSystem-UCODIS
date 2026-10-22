import { demoDayOffset } from '../clock'
import { moduleTogglesCollection } from '../fixtures/settings/moduleToggles'
import { orgUnitsCollection } from '../fixtures/hr/orgUnits'
import { employeeCategoriesCollection } from '../fixtures/hr/employeeCategories'
import { leaveTypesCollection } from '../fixtures/hr/leaveTypes'
import { jobPositionsCollection } from '../fixtures/hr/jobPositions'
import { publicHolidaysCollection, workingCalendarCollection } from '../fixtures/hr/calendar'
import { employeesCollection } from '../fixtures/hr/employees'
import { leaveBalanceAdjustmentsCollection, leaveRequestsCollection } from '../fixtures/hr/leave'
import { createCollection, type CollectionContext } from './collection'
import { clearStoredCollections } from './storage'

/** Bump when fixtures change shape: every collection is then reseeded. */
export const MOCK_SEED_VERSION = 2

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
    leaveBalanceAdjustments: createCollection(leaveBalanceAdjustmentsCollection, context)
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
