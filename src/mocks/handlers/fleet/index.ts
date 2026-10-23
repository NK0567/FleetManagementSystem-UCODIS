import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import { registerFleetSettingsHandlers } from './settings'
import { registerVehicleTypesHandlers } from './vehicleTypes'
import { registerEquipmentTypesHandlers } from './equipmentTypes'
import { registerSiteTypesHandlers } from './siteTypes'
import { registerSitesHandlers } from './sites'
import { registerProvidersHandlers } from './providers'

export function registerFleetHandlers(router: MockRouter, db: MockDatabase): void {
  registerFleetSettingsHandlers(router, db)
  registerVehicleTypesHandlers(router, db)
  registerEquipmentTypesHandlers(router, db)
  registerSiteTypesHandlers(router, db)
  registerSitesHandlers(router, db)
  registerProvidersHandlers(router, db)
}
