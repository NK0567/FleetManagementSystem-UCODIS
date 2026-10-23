import { registerFleetModule } from './fleet/fleet.module'
import { registerHrModule } from './hr/hr.module'
import { registerSettingsModule } from './settings/settings.module'

/** Each business module registers its navigation, guarded routes and searchable entities here. */
export function registerModules(): void {
  registerHrModule()
  registerFleetModule()
  registerSettingsModule()
}
