import { demoDayOffset } from '../clock'
import { moduleTogglesCollection } from '../fixtures/settings/moduleToggles'
import { orgUnitsCollection } from '../fixtures/hr/orgUnits'
import { employeeCategoriesCollection } from '../fixtures/hr/employeeCategories'
import { leaveTypesCollection } from '../fixtures/hr/leaveTypes'
import { jobPositionsCollection } from '../fixtures/hr/jobPositions'
import { publicHolidaysCollection, workingCalendarCollection } from '../fixtures/hr/calendar'
import { employeesCollection } from '../fixtures/hr/employees'
import { leaveBalanceAdjustmentsCollection, leaveRequestsCollection } from '../fixtures/hr/leave'
import { fleetSettingsCollection } from '../fixtures/fleet/settings'
import { maintenanceSettingsCollection } from '../fixtures/maintenance/settings'
import { vehicleTypesCollection } from '../fixtures/fleet/vehicleTypes'
import { equipmentTypesCollection } from '../fixtures/fleet/equipmentTypes'
import { siteTypesCollection } from '../fixtures/fleet/siteTypes'
import { sitesCollection } from '../fixtures/fleet/sites'
import { providersCollection } from '../fixtures/fleet/providers'
import { vehiclesCollection } from '../fixtures/fleet/vehicles'
import { vehicleEquipmentCollection } from '../fixtures/fleet/vehicleEquipment'
import { couplingsCollection } from '../fixtures/fleet/couplings'
import { driverAssignmentsCollection } from '../fixtures/fleet/driverAssignments'
import { routeTemplatesCollection } from '../fixtures/fleet/routeTemplates'
import { tripsCollection } from '../fixtures/fleet/trips'
import {
  fleetStatusArchivesCollection,
  fleetStatusNotesCollection
} from '../fixtures/fleet/fleetStatus'
import { filesCollection } from '../fixtures/files'
import { createFileStore, type FileStore } from '../files/fileStore'
import { documentTypesCollection } from '../fixtures/fleet/documentTypes'
import { documentsCollection } from '../fixtures/fleet/documents'
import { companyDocumentsCollection } from '../fixtures/fleet/companyDocuments'
import { insurancePoliciesCollection } from '../fixtures/fleet/insurancePolicies'
import { claimsCollection } from '../fixtures/fleet/claims'
import { infractionTypesCollection } from '../fixtures/fleet/infractionTypes'
import { infractionsCollection } from '../fixtures/fleet/infractions'
import { trainingsCollection } from '../fixtures/fleet/trainings'
import { checkPointsCollection } from '../fixtures/fleet/checkPoints'
import { inspectionsCollection } from '../fixtures/fleet/inspections'
import { roadChecklistsCollection } from '../fixtures/fleet/roadChecklists'
import { departureAuthorizationsCollection } from '../fixtures/fleet/departureAuthorizations'
import { deviationTypesCollection } from '../fixtures/fleet/deviationTypes'
import { routeDeviationsCollection } from '../fixtures/fleet/routeDeviations'
import { alertRulesCollection } from '../fixtures/fleet/alertRules'
import { alertHandlingsCollection } from '../fixtures/fleet/alertHandlings'
import { fuelGapFilesCollection } from '../fixtures/fleet/fuelGapFiles'
import { fuelGapCausesCollection } from '../fixtures/fleet/fuelGapCauses'
import { fuelRefillsCollection } from '../fixtures/fleet/fuelRefills'
import { fuelCardsCollection } from '../fixtures/fleet/fuelCards'
import { fuelCardTransactionsCollection } from '../fixtures/fleet/fuelCardTransactions'
import { telematicsEventTypesCollection } from '../fixtures/fleet/telematicsEventTypes'
import { telematicsEventsCollection } from '../fixtures/fleet/telematicsEvents'
import { competencesCollection } from '../fixtures/maintenance/competences'
import { failureCodesCollection } from '../fixtures/maintenance/failureCodes'
import { downtimeCodesCollection } from '../fixtures/maintenance/downtimeCodes'
import { missionTypesCollection } from '../fixtures/maintenance/missionTypes'
import { techniciansCollection } from '../fixtures/maintenance/technicians'
import { downtimesCollection } from '../fixtures/maintenance/downtimes'
import { workOrdersCollection } from '../fixtures/maintenance/workOrders'
import { maintenancePlansCollection } from '../fixtures/maintenance/maintenancePlans'
import { serviceRecordsCollection } from '../fixtures/maintenance/serviceRecords'
import { stockItemsCollection } from '../fixtures/maintenance/stockItems'
import { stockMovementsCollection } from '../fixtures/maintenance/stockMovements'
import { purchaseRequestsCollection } from '../fixtures/maintenance/purchaseRequests'
import { vehicleCheckPointsCollection } from '../fixtures/maintenance/vehicleCheckPoints'
import { vehicleChecksCollection } from '../fixtures/maintenance/vehicleChecks'
import { mobileInterventionsCollection } from '../fixtures/maintenance/mobileInterventions'
import { tyreLayoutsCollection } from '../fixtures/maintenance/tyreLayouts'
import { tyresCollection } from '../fixtures/maintenance/tyres'
import { planningSettingsCollection } from '../fixtures/planning/settings'
import { planningReasonsCollection } from '../fixtures/planning/planningReasons'
import { customersCollection } from '../fixtures/planning/customers'
import { deliveryPointsCollection } from '../fixtures/planning/deliveryPoints'
import { productsCollection } from '../fixtures/planning/products'
import { productCompatibilitiesCollection } from '../fixtures/planning/productCompatibilities'
import { quantityTolerancesCollection } from '../fixtures/planning/quantityTolerances'
import { transportTariffsCollection } from '../fixtures/planning/transportTariffs'
import { deliveryRequestsCollection } from '../fixtures/planning/deliveryRequests'
import { transportOrdersCollection } from '../fixtures/planning/transportOrders'
import { createCollection, type CollectionContext } from './collection'
import { clearStoredCollections } from './storage'

/** Bump when fixtures change shape: every collection is then reseeded. */
export const MOCK_SEED_VERSION = 46

export function createDatabase(
  context: CollectionContext = {
    seedVersion: MOCK_SEED_VERSION,
    dayOffset: demoDayOffset()
  },
  fileStore: FileStore = createFileStore()
) {
  const collections = {
    files: createCollection(filesCollection, context),
    moduleToggles: createCollection(moduleTogglesCollection, context),
    orgUnits: createCollection(orgUnitsCollection, context),
    employeeCategories: createCollection(employeeCategoriesCollection, context),
    leaveTypes: createCollection(leaveTypesCollection, context),
    jobPositions: createCollection(jobPositionsCollection, context),
    workingCalendar: createCollection(workingCalendarCollection, context),
    publicHolidays: createCollection(publicHolidaysCollection, context),
    employees: createCollection(employeesCollection, context),
    leaveRequests: createCollection(leaveRequestsCollection, context),
    leaveBalanceAdjustments: createCollection(leaveBalanceAdjustmentsCollection, context),
    fleetSettings: createCollection(fleetSettingsCollection, context),
    maintenanceSettings: createCollection(maintenanceSettingsCollection, context),
    planningSettings: createCollection(planningSettingsCollection, context),
    vehicleTypes: createCollection(vehicleTypesCollection, context),
    equipmentTypes: createCollection(equipmentTypesCollection, context),
    siteTypes: createCollection(siteTypesCollection, context),
    sites: createCollection(sitesCollection, context),
    providers: createCollection(providersCollection, context),
    vehicles: createCollection(vehiclesCollection, context),
    vehicleEquipment: createCollection(vehicleEquipmentCollection, context),
    couplings: createCollection(couplingsCollection, context),
    driverAssignments: createCollection(driverAssignmentsCollection, context),
    routeTemplates: createCollection(routeTemplatesCollection, context),
    trips: createCollection(tripsCollection, context),
    fleetStatusNotes: createCollection(fleetStatusNotesCollection, context),
    fleetStatusArchives: createCollection(fleetStatusArchivesCollection, context),
    documentTypes: createCollection(documentTypesCollection, context),
    documents: createCollection(documentsCollection, context),
    companyDocuments: createCollection(companyDocumentsCollection, context),
    insurancePolicies: createCollection(insurancePoliciesCollection, context),
    claims: createCollection(claimsCollection, context),
    infractionTypes: createCollection(infractionTypesCollection, context),
    infractions: createCollection(infractionsCollection, context),
    trainings: createCollection(trainingsCollection, context),
    checkPoints: createCollection(checkPointsCollection, context),
    inspections: createCollection(inspectionsCollection, context),
    roadChecklists: createCollection(roadChecklistsCollection, context),
    departureAuthorizations: createCollection(departureAuthorizationsCollection, context),
    deviationTypes: createCollection(deviationTypesCollection, context),
    routeDeviations: createCollection(routeDeviationsCollection, context),
    alertRules: createCollection(alertRulesCollection, context),
    alertHandlings: createCollection(alertHandlingsCollection, context),
    fuelGapFiles: createCollection(fuelGapFilesCollection, context),
    fuelGapCauses: createCollection(fuelGapCausesCollection, context),
    fuelRefills: createCollection(fuelRefillsCollection, context),
    fuelCards: createCollection(fuelCardsCollection, context),
    fuelCardTransactions: createCollection(fuelCardTransactionsCollection, context),
    telematicsEventTypes: createCollection(telematicsEventTypesCollection, context),
    telematicsEvents: createCollection(telematicsEventsCollection, context),
    competences: createCollection(competencesCollection, context),
    failureCodes: createCollection(failureCodesCollection, context),
    downtimeCodes: createCollection(downtimeCodesCollection, context),
    missionTypes: createCollection(missionTypesCollection, context),
    technicians: createCollection(techniciansCollection, context),
    downtimes: createCollection(downtimesCollection, context),
    workOrders: createCollection(workOrdersCollection, context),
    maintenancePlans: createCollection(maintenancePlansCollection, context),
    serviceRecords: createCollection(serviceRecordsCollection, context),
    stockItems: createCollection(stockItemsCollection, context),
    stockMovements: createCollection(stockMovementsCollection, context),
    purchaseRequests: createCollection(purchaseRequestsCollection, context),
    vehicleCheckPoints: createCollection(vehicleCheckPointsCollection, context),
    vehicleChecks: createCollection(vehicleChecksCollection, context),
    mobileInterventions: createCollection(mobileInterventionsCollection, context),
    tyreLayouts: createCollection(tyreLayoutsCollection, context),
    tyres: createCollection(tyresCollection, context),
    planningReasons: createCollection(planningReasonsCollection, context),
    customers: createCollection(customersCollection, context),
    deliveryPoints: createCollection(deliveryPointsCollection, context),
    products: createCollection(productsCollection, context),
    productCompatibilities: createCollection(productCompatibilitiesCollection, context),
    quantityTolerances: createCollection(quantityTolerancesCollection, context),
    transportTariffs: createCollection(transportTariffsCollection, context),
    deliveryRequests: createCollection(deliveryRequestsCollection, context),
    transportOrders: createCollection(transportOrdersCollection, context)
  }

  return {
    ...collections,
    fileStore,
    reset(): void {
      clearStoredCollections()
      for (const collection of Object.values(collections)) collection.reset()
      void fileStore.clear()
    }
  }
}

export type MockDatabase = ReturnType<typeof createDatabase>
