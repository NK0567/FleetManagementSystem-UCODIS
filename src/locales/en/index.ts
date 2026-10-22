import common from './common'
import auth from './auth'
import nav from './nav'
import home from './home'
import hrEmployeeCategories from './hrEmployeeCategories'
import hrEmployees from './hrEmployees'
import hrJobPositions from './hrJobPositions'
import hrLeaveBalances from './hrLeaveBalances'
import hrLeaveRequests from './hrLeaveRequests'
import hrLeaveTypes from './hrLeaveTypes'
import hrOrgUnits from './hrOrgUnits'
import hrPublicHolidays from './hrPublicHolidays'
import hrWorkingCalendar from './hrWorkingCalendar'
import settingsModuleToggles from './settingsModuleToggles'

export default {
  ...common,
  ...auth,
  ...nav,
  ...home,
  ...hrEmployeeCategories,
  ...hrEmployees,
  ...hrJobPositions,
  ...hrLeaveBalances,
  ...hrLeaveRequests,
  ...hrLeaveTypes,
  ...hrOrgUnits,
  ...hrPublicHolidays,
  ...hrWorkingCalendar,
  ...settingsModuleToggles
}
