import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import { registerPlanningSettingsHandlers } from './settings'
import { registerPlanningReasonsHandlers } from './planningReasons'
import { registerCustomersHandlers } from './customers'
import { registerDeliveryPointsHandlers } from './deliveryPoints'
import { registerProductsHandlers } from './products'

export function registerPlanningHandlers(router: MockRouter, db: MockDatabase): void {
  registerPlanningSettingsHandlers(router, db)
  registerPlanningReasonsHandlers(router, db)
  registerCustomersHandlers(router, db)
  registerDeliveryPointsHandlers(router, db)
  registerProductsHandlers(router, db)
}
