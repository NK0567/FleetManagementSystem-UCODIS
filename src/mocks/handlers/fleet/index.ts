import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import { registerFleetSettingsHandlers } from './settings'
import { registerSettingsListsHandlers } from './settingsLists'
import { registerVehicleTypesHandlers } from './vehicleTypes'
import { registerEquipmentTypesHandlers } from './equipmentTypes'
import { registerSiteTypesHandlers } from './siteTypes'
import { registerSitesHandlers } from './sites'
import { registerProvidersHandlers } from './providers'
import { registerProviderTypesHandlers } from './providerTypes'
import { registerProviderSyncHandlers } from './providerSync'
import { registerVehiclesHandlers } from './vehicles'
import { registerVehicleRecordsHandlers } from './vehicleRecords'
import { registerCouplingsHandlers } from './couplings'
import { registerDriverAssignmentsHandlers } from './driverAssignments'
import { registerDriversHandlers } from './drivers'
import { registerRouteTemplatesHandlers } from './routeTemplates'
import { registerTripsHandlers } from './trips'
import { registerAvailabilityHandlers } from './availability'
import { registerFleetStatusHandlers } from './fleetStatus'
import { registerDocumentTypesHandlers } from './documentTypes'
import { registerDocumentsHandlers } from './documents'
import { registerCompanyDocumentsHandlers } from './companyDocuments'
import { registerInsurancePoliciesHandlers } from './insurancePolicies'
import { registerClaimsHandlers } from './claims'
import { registerInfractionTypesHandlers } from './infractionTypes'
import { registerInfractionsHandlers } from './infractions'
import { registerTrainingsHandlers } from './trainings'
import { registerCheckPointsHandlers } from './checkPoints'
import { registerInspectionsHandlers } from './inspections'
import { registerInspectionItemsHandlers } from './inspectionItems'
import { registerFuelReferencesHandlers } from './fuelReferences'
import { registerRoadChecklistsHandlers } from './roadChecklists'
import { registerDepartureAuthorizationsHandlers } from './departureAuthorizations'
import { registerDeviationTypesHandlers } from './deviationTypes'
import { registerRouteDeviationsHandlers } from './routeDeviations'
import { registerAlertRulesHandlers } from './alertRules'
import { registerAlertsHandlers } from './alerts'
import { registerInboxHandlers } from './inbox'
import { registerDrivingTimeHandlers } from './drivingTime'
import { registerFuelConsumptionHandlers } from './fuelConsumption'
import { registerFuelGapCausesHandlers } from './fuelGapCauses'
import { registerFuelRefillsHandlers } from './fuelRefills'
import { registerFuelCardsHandlers } from './fuelCards'
import { registerFuelCardTransactionsHandlers } from './fuelCardTransactions'
import { registerTelematicsEventTypesHandlers } from './telematicsEventTypes'
import { registerTelematicsEventsHandlers } from './telematicsEvents'
import { registerLivePositionsHandlers } from './livePositions'
import { registerDriverScoresHandlers } from './driverScores'
import { registerDriverActivityHandlers } from './driverActivity'
import { registerFleetDashboardHandlers } from './fleetDashboard'
import { registerFleetReportsHandlers } from './fleetReports'

export function registerFleetHandlers(router: MockRouter, db: MockDatabase): void {
  registerSettingsListsHandlers(router, db)
  registerFleetSettingsHandlers(router, db)
  registerVehicleTypesHandlers(router, db)
  registerEquipmentTypesHandlers(router, db)
  registerSiteTypesHandlers(router, db)
  registerSitesHandlers(router, db)
  registerProviderTypesHandlers(router, db)
  registerProviderSyncHandlers(router, db)
  registerProvidersHandlers(router, db)
  registerVehicleRecordsHandlers(router, db)
  registerVehiclesHandlers(router, db)
  registerCouplingsHandlers(router, db)
  registerDriverAssignmentsHandlers(router, db)
  registerDriversHandlers(router, db)
  registerRouteTemplatesHandlers(router, db)
  registerTripsHandlers(router, db)
  registerAvailabilityHandlers(router, db)
  registerFleetStatusHandlers(router, db)
  registerDocumentTypesHandlers(router, db)
  registerDocumentsHandlers(router, db)
  registerCompanyDocumentsHandlers(router, db)
  registerInsurancePoliciesHandlers(router, db)
  registerClaimsHandlers(router, db)
  registerInfractionTypesHandlers(router, db)
  registerInfractionsHandlers(router, db)
  registerTrainingsHandlers(router, db)
  registerCheckPointsHandlers(router, db)
  registerInspectionsHandlers(router, db)
  registerInspectionItemsHandlers(router, db)
  registerFuelReferencesHandlers(router, db)
  registerRoadChecklistsHandlers(router, db)
  registerDepartureAuthorizationsHandlers(router, db)
  registerDeviationTypesHandlers(router, db)
  registerRouteDeviationsHandlers(router, db)
  registerAlertRulesHandlers(router, db)
  registerAlertsHandlers(router, db)
  registerInboxHandlers(router, db)
  registerDrivingTimeHandlers(router, db)
  registerFuelConsumptionHandlers(router, db)
  registerFuelGapCausesHandlers(router, db)
  registerFuelRefillsHandlers(router, db)
  registerFuelCardsHandlers(router, db)
  registerFuelCardTransactionsHandlers(router, db)
  registerTelematicsEventTypesHandlers(router, db)
  registerTelematicsEventsHandlers(router, db)
  registerLivePositionsHandlers(router, db)
  registerDriverScoresHandlers(router, db)
  registerDriverActivityHandlers(router, db)
  registerFleetDashboardHandlers(router, db)
  registerFleetReportsHandlers(router, db)
}
