import { registerFleetModule } from './fleet/fleet.module'
import { registerHrModule } from './hr/hr.module'
import { registerMaintenanceModule } from './maintenance/maintenance.module'
import { registerPlanningModule } from './planning/planning.module'
import { registerSelfServiceModule } from './self-service'
import { registerSettingsModule } from './settings/settings.module'

/** Each business module registers its navigation, guarded routes and searchable entities here. */
export function registerModules(): void {
  registerHrModule()
  registerFleetModule()
  registerPlanningModule()
  registerSelfServiceModule()
  registerMaintenanceModule()
  registerSettingsModule()
}
