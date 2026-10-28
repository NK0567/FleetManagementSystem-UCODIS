import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import {
  registerEmployeeCategoryHandlers,
  registerJobPositionHandlers,
  registerLeaveTypeHandlers,
  registerPublicHolidayHandlers
} from './referenceEntities'
import { registerOrgUnitHandlers } from './orgUnits'
import { registerEmployeeHandlers } from './employees'
import { registerWorkingCalendarHandlers } from './workingCalendar'
import { registerLeaveHandlers } from './leaveRequests'
import { registerDashboardHandlers } from './dashboard'

export function registerHrHandlers(router: MockRouter, db: MockDatabase): void {
  registerEmployeeCategoryHandlers(router, db)
  registerLeaveTypeHandlers(router, db)
  registerJobPositionHandlers(router, db)
  registerPublicHolidayHandlers(router, db)
  registerOrgUnitHandlers(router, db)
  registerEmployeeHandlers(router, db)
  registerWorkingCalendarHandlers(router, db)
  registerLeaveHandlers(router, db)
  registerDashboardHandlers(router, db)
}
