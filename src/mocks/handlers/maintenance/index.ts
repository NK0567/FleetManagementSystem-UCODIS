import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import { registerMaintenanceSettingsHandlers } from './settings'
import { registerCompetencesHandlers } from './competences'
import { registerFailureCodesHandlers } from './failureCodes'
import { registerDowntimeCodesHandlers } from './downtimeCodes'
import { registerMissionTypesHandlers } from './missionTypes'
import { registerTechniciansHandlers } from './technicians'
import { registerDowntimesHandlers } from './downtimes'
import { registerWorkOrdersHandlers } from './workOrders'
import { registerMaintenancePlansHandlers } from './maintenancePlans'
import { registerServiceDueHandlers } from './serviceDue'
import { registerStockItemsHandlers } from './stockItems'

export function registerMaintenanceHandlers(router: MockRouter, db: MockDatabase): void {
  registerMaintenanceSettingsHandlers(router, db)
  registerCompetencesHandlers(router, db)
  registerFailureCodesHandlers(router, db)
  registerDowntimeCodesHandlers(router, db)
  registerMissionTypesHandlers(router, db)
  registerTechniciansHandlers(router, db)
  registerDowntimesHandlers(router, db)
  registerWorkOrdersHandlers(router, db)
  registerMaintenancePlansHandlers(router, db)
  registerServiceDueHandlers(router, db)
  registerStockItemsHandlers(router, db)
}
