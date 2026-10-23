import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const FLEET_MENU_ORDER = 30

export function registerFleetModule(): void {
  registerFeatureRoutes({
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
      { labelKey: 'nav.trips', to: '/fleet/trips', menuKey: 'trip' },
      { labelKey: 'nav.vehicles', to: '/fleet/vehicles', menuKey: 'vehicle' },
      { labelKey: 'nav.couplings', to: '/fleet/couplings', menuKey: 'coupling' },
      {
        labelKey: 'nav.driverAssignments',
        to: '/fleet/driver-assignments',
        menuKey: 'driverAssignment'
      },
      { labelKey: 'nav.drivers', to: '/fleet/drivers', menuKey: 'driver' },
      { labelKey: 'nav.fleetStatus', to: '/fleet/fleet-status', menuKey: 'fleetStatus' },
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
      { labelKey: 'nav.fleetSettings', to: '/fleet/settings', menuKey: 'fleetSettings' }
    ]
  })
}
