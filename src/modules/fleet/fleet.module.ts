import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const FLEET_MENU_ORDER = 30

export function registerFleetModule(): void {
  registerFeatureRoutes({
    ALERT: { to: '/fleet/alerts', menuKey: 'alert' },
    LIVEMAP: { to: '/fleet/live-map', menuKey: 'liveMap' },
    TRIP: { to: '/fleet/trips', menuKey: 'trip' },
    VEHICLE: { to: '/fleet/vehicles', menuKey: 'vehicle' },
    COUPLING: { to: '/fleet/couplings', menuKey: 'coupling' },
    DRIVERASSIGNMENT: { to: '/fleet/driver-assignments', menuKey: 'driverAssignment' },
    DRIVER: { to: '/fleet/drivers', menuKey: 'driver' },
    FLEETSTATUS: { to: '/fleet/fleet-status', menuKey: 'fleetStatus' },
    DOCUMENT: { to: '/fleet/documents', menuKey: 'document' },
    COMPANYDOCUMENT: { to: '/fleet/company-documents', menuKey: 'companyDocument' },
    INSURANCEPOLICY: { to: '/fleet/insurance-policies', menuKey: 'insurancePolicy' },
    CLAIM: { to: '/fleet/claims', menuKey: 'claim' },
    INFRACTION: { to: '/fleet/infractions', menuKey: 'infraction' },
    TRAINING: { to: '/fleet/trainings', menuKey: 'training' },
    INFRACTIONTYPE: { to: '/fleet/infraction-types', menuKey: 'infractionType' },
    ROUTEDEVIATION: { to: '/fleet/route-deviations', menuKey: 'routeDeviation' },
    DEVIATIONTYPE: { to: '/fleet/deviation-types', menuKey: 'deviationType' },
    ALERTRULE: { to: '/fleet/alert-rules', menuKey: 'alertRule' },
    FUELREFILL: { to: '/fleet/fuel-refills', menuKey: 'fuelRefill' },
    FUELCONSUMPTION: { to: '/fleet/fuel-consumption', menuKey: 'fuelConsumption' },
    FUELGAPCAUSE: { to: '/fleet/fuel-gap-causes', menuKey: 'fuelGapCause' },
    FUELCARD: { to: '/fleet/fuel-cards', menuKey: 'fuelCard' },
    TELEMATICS: { to: '/fleet/telematics-events', menuKey: 'telematicsEvent' },
    TELEMATICSEVENTTYPE: { to: '/fleet/telematics-event-types', menuKey: 'telematicsEventType' },
    ROADCHECKLIST: { to: '/fleet/road-checklists', menuKey: 'roadChecklist' },
    DEPARTUREAUTHORIZATION: {
      to: '/fleet/departure-authorizations',
      menuKey: 'departureAuthorization'
    },
    INSPECTION: { to: '/fleet/inspections', menuKey: 'inspection' },
    CHECKPOINT: { to: '/fleet/check-points', menuKey: 'checkPoint' },
    SITE: { to: '/fleet/sites', menuKey: 'site' },
    ROUTETEMPLATE: { to: '/fleet/route-templates', menuKey: 'routeTemplate' },
    PROVIDER: { to: '/fleet/providers', menuKey: 'provider' },
    VEHICLETYPE: { to: '/fleet/vehicle-types', menuKey: 'vehicleType' },
    EQUIPMENTTYPE: { to: '/fleet/equipment-types', menuKey: 'equipmentType' },
    SITETYPE: { to: '/fleet/site-types', menuKey: 'siteType' },
    DOCUMENTTYPE: { to: '/fleet/document-types', menuKey: 'documentType' },
    FLEETSETTINGS: { to: '/fleet/settings', menuKey: 'fleetSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.fleet',
    order: FLEET_MENU_ORDER,
    subItems: [
      { labelKey: 'nav.alerts', to: '/fleet/alerts', menuKey: 'alert' },
      { labelKey: 'nav.liveMap', to: '/fleet/live-map', menuKey: 'liveMap' },
      { labelKey: 'nav.trips', to: '/fleet/trips', menuKey: 'trip' },
      {
        labelKey: 'nav.departureAuthorizations',
        to: '/fleet/departure-authorizations',
        menuKey: 'departureAuthorization'
      },
      { labelKey: 'nav.routeDeviations', to: '/fleet/route-deviations', menuKey: 'routeDeviation' },
      {
        labelKey: 'nav.telematicsEvents',
        to: '/fleet/telematics-events',
        menuKey: 'telematicsEvent'
      },
      { labelKey: 'nav.vehicles', to: '/fleet/vehicles', menuKey: 'vehicle' },
      { labelKey: 'nav.couplings', to: '/fleet/couplings', menuKey: 'coupling' },
      {
        labelKey: 'nav.driverAssignments',
        to: '/fleet/driver-assignments',
        menuKey: 'driverAssignment'
      },
      { labelKey: 'nav.drivers', to: '/fleet/drivers', menuKey: 'driver' },
      { labelKey: 'nav.fleetStatus', to: '/fleet/fleet-status', menuKey: 'fleetStatus' },
      { labelKey: 'nav.fuelRefills', to: '/fleet/fuel-refills', menuKey: 'fuelRefill' },
      {
        labelKey: 'nav.fuelConsumption',
        to: '/fleet/fuel-consumption',
        menuKey: 'fuelConsumption'
      },
      { labelKey: 'nav.fuelCards', to: '/fleet/fuel-cards', menuKey: 'fuelCard' },
      {
        labelKey: 'nav.fuelCardTransactions',
        to: '/fleet/fuel-cards/transactions',
        menuKey: 'fuelCard'
      },
      { labelKey: 'nav.documents', to: '/fleet/documents', menuKey: 'document' },
      {
        labelKey: 'nav.missingDocuments',
        to: '/fleet/documents/missing',
        menuKey: 'document'
      },
      {
        labelKey: 'nav.companyDocuments',
        to: '/fleet/company-documents',
        menuKey: 'companyDocument'
      },
      { labelKey: 'nav.claims', to: '/fleet/claims', menuKey: 'claim' },
      { labelKey: 'nav.infractions', to: '/fleet/infractions', menuKey: 'infraction' },
      { labelKey: 'nav.trainings', to: '/fleet/trainings', menuKey: 'training' },
      { labelKey: 'nav.roadChecklists', to: '/fleet/road-checklists', menuKey: 'roadChecklist' },
      { labelKey: 'nav.inspections', to: '/fleet/inspections', menuKey: 'inspection' },
      {
        labelKey: 'nav.insurancePolicies',
        to: '/fleet/insurance-policies',
        menuKey: 'insurancePolicy'
      },
      { labelKey: 'nav.routeTemplates', to: '/fleet/route-templates', menuKey: 'routeTemplate' },
      { labelKey: 'nav.sites', to: '/fleet/sites', menuKey: 'site' },
      { labelKey: 'nav.providers', to: '/fleet/providers', menuKey: 'provider' },
      { labelKey: 'nav.vehicleTypes', to: '/fleet/vehicle-types', menuKey: 'vehicleType' },
      { labelKey: 'nav.equipmentTypes', to: '/fleet/equipment-types', menuKey: 'equipmentType' },
      { labelKey: 'nav.siteTypes', to: '/fleet/site-types', menuKey: 'siteType' },
      { labelKey: 'nav.documentTypes', to: '/fleet/document-types', menuKey: 'documentType' },
      { labelKey: 'nav.checkPoints', to: '/fleet/check-points', menuKey: 'checkPoint' },
      { labelKey: 'nav.deviationTypes', to: '/fleet/deviation-types', menuKey: 'deviationType' },
      {
        labelKey: 'nav.telematicsEventTypes',
        to: '/fleet/telematics-event-types',
        menuKey: 'telematicsEventType'
      },
      { labelKey: 'nav.alertRules', to: '/fleet/alert-rules', menuKey: 'alertRule' },
      { labelKey: 'nav.fuelGapCauses', to: '/fleet/fuel-gap-causes', menuKey: 'fuelGapCause' },
      {
        labelKey: 'nav.infractionTypes',
        to: '/fleet/infraction-types',
        menuKey: 'infractionType'
      },
      { labelKey: 'nav.fleetSettings', to: '/fleet/settings', menuKey: 'fleetSettings' }
    ]
  })
}
