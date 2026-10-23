import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import { registerFleetSettingsHandlers } from './settings'
import { registerVehicleTypesHandlers } from './vehicleTypes'
import { registerEquipmentTypesHandlers } from './equipmentTypes'
import { registerSiteTypesHandlers } from './siteTypes'
import { registerSitesHandlers } from './sites'
import { registerProvidersHandlers } from './providers'
import { registerVehiclesHandlers } from './vehicles'
import { registerCouplingsHandlers } from './couplings'
import { registerDriverAssignmentsHandlers } from './driverAssignments'
import { registerDriversHandlers } from './drivers'
import { registerRouteTemplatesHandlers } from './routeTemplates'
import { registerTripsHandlers } from './trips'
import { registerFleetStatusHandlers } from './fleetStatus'
import { registerDocumentTypesHandlers } from './documentTypes'
import { registerDocumentsHandlers } from './documents'
import { registerCompanyDocumentsHandlers } from './companyDocuments'
import { registerInsurancePoliciesHandlers } from './insurancePolicies'
import { registerClaimsHandlers } from './claims'

export function registerFleetHandlers(router: MockRouter, db: MockDatabase): void {
  registerFleetSettingsHandlers(router, db)
  registerVehicleTypesHandlers(router, db)
  registerEquipmentTypesHandlers(router, db)
  registerSiteTypesHandlers(router, db)
  registerSitesHandlers(router, db)
  registerProvidersHandlers(router, db)
  registerVehiclesHandlers(router, db)
  registerCouplingsHandlers(router, db)
  registerDriverAssignmentsHandlers(router, db)
  registerDriversHandlers(router, db)
  registerRouteTemplatesHandlers(router, db)
  registerTripsHandlers(router, db)
  registerFleetStatusHandlers(router, db)
  registerDocumentTypesHandlers(router, db)
  registerDocumentsHandlers(router, db)
  registerCompanyDocumentsHandlers(router, db)
  registerInsurancePoliciesHandlers(router, db)
  registerClaimsHandlers(router, db)
}
