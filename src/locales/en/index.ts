import common from './common'
import auth from './auth'
import nav from './nav'
import home from './home'
import hrEmployeeCategories from './hrEmployeeCategories'
import hrJobPositions from './hrJobPositions'
import hrLeaveTypes from './hrLeaveTypes'
import hrPublicHolidays from './hrPublicHolidays'
import settingsModuleToggles from './settingsModuleToggles'

export default {
  ...common,
  ...auth,
  ...nav,
  ...home,
  ...hrEmployeeCategories,
  ...hrJobPositions,
  ...hrLeaveTypes,
  ...hrPublicHolidays,
  ...settingsModuleToggles
}
