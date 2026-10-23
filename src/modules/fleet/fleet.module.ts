import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const FLEET_MENU_ORDER = 30

export function registerFleetModule(): void {
  registerFeatureRoutes({
    VEHICLE: { to: '/fleet/vehicles', menuKey: 'vehicle' },
    COUPLING: { to: '/fleet/couplings', menuKey: 'coupling' },
    DRIVERASSIGNMENT: { to: '/fleet/driver-assignments', menuKey: 'driverAssignment' },
    DRIVER: { to: '/fleet/drivers', menuKey: 'driver' },
    SITE: { to: '/fleet/sites', menuKey: 'site' },
    PROVIDER: { to: '/fleet/providers', menuKey: 'provider' },
    VEHICLETYPE: { to: '/fleet/vehicle-types', menuKey: 'vehicleType' },
    EQUIPMENTTYPE: { to: '/fleet/equipment-types', menuKey: 'equipmentType' },
    SITETYPE: { to: '/fleet/site-types', menuKey: 'siteType' },
    FLEETSETTINGS: { to: '/fleet/settings', menuKey: 'fleetSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.fleet',
    order: FLEET_MENU_ORDER,
    subItems: [
      { labelKey: 'nav.vehicles', to: '/fleet/vehicles', menuKey: 'vehicle' },
      { labelKey: 'nav.couplings', to: '/fleet/couplings', menuKey: 'coupling' },
      {
        labelKey: 'nav.driverAssignments',
        to: '/fleet/driver-assignments',
        menuKey: 'driverAssignment'
      },
      { labelKey: 'nav.drivers', to: '/fleet/drivers', menuKey: 'driver' },
      { labelKey: 'nav.sites', to: '/fleet/sites', menuKey: 'site' },
      { labelKey: 'nav.providers', to: '/fleet/providers', menuKey: 'provider' },
      { labelKey: 'nav.vehicleTypes', to: '/fleet/vehicle-types', menuKey: 'vehicleType' },
      { labelKey: 'nav.equipmentTypes', to: '/fleet/equipment-types', menuKey: 'equipmentType' },
      { labelKey: 'nav.siteTypes', to: '/fleet/site-types', menuKey: 'siteType' },
      { labelKey: 'nav.fleetSettings', to: '/fleet/settings', menuKey: 'fleetSettings' }
    ]
  })
}
