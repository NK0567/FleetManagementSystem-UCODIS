import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import { registerPlanningSettingsHandlers } from './settings'
import { registerPlanningReasonsHandlers } from './planningReasons'
import { registerCustomersHandlers } from './customers'
import { registerDeliveryPointsHandlers } from './deliveryPoints'
import { registerProductsHandlers } from './products'
import { registerProductCompatibilitiesHandlers } from './productCompatibilities'
import { registerQuantityTolerancesHandlers } from './quantityTolerances'
import { registerTransportTariffsHandlers } from './transportTariffs'
import { registerDeliveryRequestsHandlers } from './deliveryRequests'

export function registerPlanningHandlers(router: MockRouter, db: MockDatabase): void {
  registerPlanningSettingsHandlers(router, db)
  registerPlanningReasonsHandlers(router, db)
  registerCustomersHandlers(router, db)
  registerDeliveryPointsHandlers(router, db)
  registerProductsHandlers(router, db)
  registerProductCompatibilitiesHandlers(router, db)
  registerQuantityTolerancesHandlers(router, db)
  registerTransportTariffsHandlers(router, db)
  registerDeliveryRequestsHandlers(router, db)
}
