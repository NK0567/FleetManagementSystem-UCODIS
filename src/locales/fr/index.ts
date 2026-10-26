import common from './common'
import auth from './auth'
import nav from './nav'
import home from './home'
import hrDashboard from './hrDashboard'
import hrEmployeeCategories from './hrEmployeeCategories'
import hrEmployees from './hrEmployees'
import hrJobPositions from './hrJobPositions'
import hrLeaveBalances from './hrLeaveBalances'
import hrLeaveRequests from './hrLeaveRequests'
import hrLeaveTypes from './hrLeaveTypes'
import hrMyPlanning from './hrMyPlanning'
import hrOrgUnits from './hrOrgUnits'
import hrPublicHolidays from './hrPublicHolidays'
import hrWorkingCalendar from './hrWorkingCalendar'
import fleetSettings from './fleetSettings'
import settingsModuleToggles from './settingsModuleToggles'

import fleetVehicleTypes from './fleetVehicleTypes'
import fleetEquipmentTypes from './fleetEquipmentTypes'
import fleetSiteTypes from './fleetSiteTypes'
import fleetSites from './fleetSites'
import fleetProviders from './fleetProviders'
import fleetVehicles from './fleetVehicles'
import fleetCouplings from './fleetCouplings'
import fleetDriverAssignments from './fleetDriverAssignments'
import fleetDrivers from './fleetDrivers'
import fleetRouteTemplates from './fleetRouteTemplates'
import fleetTrips from './fleetTrips'
import fleetFleetStatus from './fleetFleetStatus'
import fleetDocumentTypes from './fleetDocumentTypes'
import fleetDocuments from './fleetDocuments'
import fleetMissingDocuments from './fleetMissingDocuments'
import fleetCompanyDocuments from './fleetCompanyDocuments'
import fleetInsurancePolicies from './fleetInsurancePolicies'
import fleetClaims from './fleetClaims'
import fleetInfractionTypes from './fleetInfractionTypes'
import fleetInfractions from './fleetInfractions'
import fleetTrainings from './fleetTrainings'
import fleetCheckPoints from './fleetCheckPoints'
import fleetInspections from './fleetInspections'
import fleetRoadChecklists from './fleetRoadChecklists'
import fleetDepartureAuthorizations from './fleetDepartureAuthorizations'
import fleetDeviationTypes from './fleetDeviationTypes'
import fleetRouteDeviations from './fleetRouteDeviations'
import fleetAlertRules from './fleetAlertRules'
import fleetAlerts from './fleetAlerts'
import fleetFuelGapCauses from './fleetFuelGapCauses'
import fleetFuelRefills from './fleetFuelRefills'
import fleetFuelConsumption from './fleetFuelConsumption'
import fleetFuelCards from './fleetFuelCards'
import fleetLiveMap from './fleetLiveMap'
import fleetDashboard from './fleetDashboard'
import fleetReports from './fleetReports'
import maintenanceSettings from './maintenanceSettings'
import fleetFuelCardTransactions from './fleetFuelCardTransactions'
import fleetTelematicsEventTypes from './fleetTelematicsEventTypes'
import fleetTelematicsEvents from './fleetTelematicsEvents'
import maintenanceCompetences from './maintenanceCompetences'
import maintenanceFailureCodes from './maintenanceFailureCodes'
import maintenanceDowntimeCodes from './maintenanceDowntimeCodes'
import maintenanceMissionTypes from './maintenanceMissionTypes'
import maintenanceTechnicians from './maintenanceTechnicians'
import maintenanceDowntimes from './maintenanceDowntimes'
import maintenanceWorkOrders from './maintenanceWorkOrders'
import maintenanceMaintenancePlans from './maintenanceMaintenancePlans'
import maintenanceServiceDue from './maintenanceServiceDue'
import maintenanceWorkshopLoad from './maintenanceWorkshopLoad'
import maintenanceReliability from './maintenanceReliability'
import maintenanceStockItems from './maintenanceStockItems'
import maintenancePurchaseRequests from './maintenancePurchaseRequests'
import maintenanceVehicleCheckPoints from './maintenanceVehicleCheckPoints'
import maintenanceVehicleChecks from './maintenanceVehicleChecks'
import maintenanceMobileInterventions from './maintenanceMobileInterventions'
import maintenanceTyreLayouts from './maintenanceTyreLayouts'
import maintenanceTyres from './maintenanceTyres'
import planningReasons from './planningReasons'
import planningSettings from './planningSettings'
import planningCustomers from './planningCustomers'
import planningDeliveryPoints from './planningDeliveryPoints'
import planningProducts from './planningProducts'
import planningProductCompatibilities from './planningProductCompatibilities'
import planningQuantityTolerances from './planningQuantityTolerances'
import planningTransportTariffs from './planningTransportTariffs'
import planningDeliveryRequests from './planningDeliveryRequests'
import planningTransportOrders from './planningTransportOrders'
import planningConfirmations from './planningConfirmations'
import planningLoading from './planningLoading'
import planningQuality from './planningQuality'
import planningBilling from './planningBilling'
import planningCarrierInvoices from './planningCarrierInvoices'
import planningFuelTours from './planningFuelTours'
import planningReports from './planningReports'
import selfService from './selfService'
export default {
  ...common,
  ...auth,
  ...nav,
  ...home,
  ...hrDashboard,
  ...hrEmployeeCategories,
  ...hrEmployees,
  ...hrJobPositions,
  ...hrLeaveBalances,
  ...hrLeaveRequests,
  ...hrLeaveTypes,
  ...hrMyPlanning,
  ...hrOrgUnits,
  ...hrPublicHolidays,
  ...hrWorkingCalendar,
  ...fleetSettings,
  ...settingsModuleToggles,
  ...fleetVehicleTypes,
  ...fleetEquipmentTypes,
  ...fleetSiteTypes,
  ...fleetSites,
  ...fleetProviders,
  ...fleetVehicles,
  ...fleetCouplings,
  ...fleetDriverAssignments,
  ...fleetDrivers,
  ...fleetRouteTemplates,
  ...fleetTrips,
  ...fleetFleetStatus,
  ...fleetDocumentTypes,
  ...fleetDocuments,
  ...fleetMissingDocuments,
  ...fleetCompanyDocuments,
  ...fleetInsurancePolicies,
  ...fleetClaims,
  ...fleetInfractionTypes,
  ...fleetInfractions,
  ...fleetTrainings,
  ...fleetCheckPoints,
  ...fleetInspections,
  ...fleetRoadChecklists,
  ...fleetDepartureAuthorizations,
  ...fleetDeviationTypes,
  ...fleetRouteDeviations,
  ...fleetAlertRules,
  ...fleetAlerts,
  ...fleetFuelGapCauses,
  ...fleetFuelRefills,
  ...fleetFuelConsumption,
  ...fleetFuelCards,
  ...fleetLiveMap,
  ...fleetDashboard,
  ...fleetReports,
  ...maintenanceSettings,
  ...fleetFuelCardTransactions,
  ...fleetTelematicsEventTypes,
  ...fleetTelematicsEvents,
  ...maintenanceCompetences,
  ...maintenanceFailureCodes,
  ...maintenanceDowntimeCodes,
  ...maintenanceMissionTypes,
  ...maintenanceTechnicians,
  ...maintenanceDowntimes,
  ...maintenanceWorkOrders,
  ...maintenanceMaintenancePlans,
  ...maintenanceServiceDue,
  ...maintenanceWorkshopLoad,
  ...maintenanceReliability,
  ...maintenanceStockItems,
  ...maintenancePurchaseRequests,
  ...maintenanceVehicleCheckPoints,
  ...maintenanceVehicleChecks,
  ...maintenanceMobileInterventions,
  ...maintenanceTyreLayouts,
  ...maintenanceTyres,
  ...planningReasons,
  ...planningSettings,
  ...planningCustomers,
  ...planningDeliveryPoints,
  ...planningProducts,
  ...planningProductCompatibilities,
  ...planningQuantityTolerances,
  ...planningTransportTariffs,
  ...planningDeliveryRequests,
  ...planningTransportOrders,
  ...planningConfirmations,
  ...planningLoading,
  ...planningQuality,
  ...planningBilling,
  ...planningCarrierInvoices,
  ...planningFuelTours,
  ...planningReports,
  ...selfService
}
