import common from './common'
import auth from './auth'
import nav from './nav'
import home from './home'
import settingsModuleToggles from './settingsModuleToggles'

export default {
  ...common,
  ...auth,
  ...nav,
  ...home,
  ...settingsModuleToggles
}
