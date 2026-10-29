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
import { registerTransportOrdersHandlers } from './transportOrders'
import { registerConfirmationsHandlers } from './confirmations'
import { registerTrackingHandlers } from './tracking'
import { registerLoadingHandlers } from './loading'
import { registerExecutionHandlers } from './execution'
import { registerReceptionHandlers } from './reception'
import { registerDeliveryQualityHandlers } from './deliveryQuality'
import { registerClosingHandlers } from './closing'
import { registerCustomerBillingHandlers } from './customerBilling'
import { registerCarrierInvoiceHandlers } from './carrierInvoices'
import { registerReportHandlers } from './reports'
import { registerDeliveryNotesHandlers } from './deliveryNotes'
import { registerPickupHandlers } from './pickup'
import { registerLoadingPreparationHandlers } from './loadingPreparations'

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
  registerTransportOrdersHandlers(router, db)
  registerConfirmationsHandlers(router, db)
  registerTrackingHandlers(router, db)
  registerLoadingHandlers(router, db)
  registerExecutionHandlers(router, db)
  registerReceptionHandlers(router, db)
  registerDeliveryNotesHandlers(router, db)
  registerPickupHandlers(router, db)
  registerLoadingPreparationHandlers(router, db)
  registerDeliveryQualityHandlers(router, db)
  registerClosingHandlers(router, db)
  registerCustomerBillingHandlers(router, db)
  registerCarrierInvoiceHandlers(router, db)
  registerReportHandlers(router, db)
}
