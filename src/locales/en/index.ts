import common from './common'
import auth from './auth'
import nav from './nav'
import home from './home'
import hrDashboard from './hrDashboard'
import hrEmployeeCategories from './hrEmployeeCategories'
import hrEmployees from './hrEmployees'
import hrJobPositions from './hrJobPositions'
import hrLeaveBalances from './hrLeaveBalances'
import hrLeaveRequests from './hrLeaveRequests'
import hrLeaveTypes from './hrLeaveTypes'
import hrMyPlanning from './hrMyPlanning'
import hrOrgUnits from './hrOrgUnits'
import hrPublicHolidays from './hrPublicHolidays'
import hrWorkingCalendar from './hrWorkingCalendar'
import fleetSettings from './fleetSettings'
import settingsModuleToggles from './settingsModuleToggles'

import fleetVehicleTypes from './fleetVehicleTypes'
import fleetEquipmentTypes from './fleetEquipmentTypes'
import fleetSiteTypes from './fleetSiteTypes'
import fleetSites from './fleetSites'
import fleetProviders from './fleetProviders'
import fleetVehicles from './fleetVehicles'
export default {
  ...common,
  ...auth,
  ...nav,
  ...home,
  ...hrDashboard,
  ...hrEmployeeCategories,
  ...hrEmployees,
  ...hrJobPositions,
  ...hrLeaveBalances,
  ...hrLeaveRequests,
  ...hrLeaveTypes,
  ...hrMyPlanning,
  ...hrOrgUnits,
  ...hrPublicHolidays,
  ...hrWorkingCalendar,
  ...fleetSettings,
  ...settingsModuleToggles,
  ...fleetVehicleTypes,
  ...fleetEquipmentTypes,
  ...fleetSiteTypes,
  ...fleetSites,
  ...fleetProviders,
  ...fleetVehicles
}
