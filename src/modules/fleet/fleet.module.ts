import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const FLEET_MENU_ORDER = 30

export function registerFleetModule(): void {
  registerFeatureRoutes({
    FLEETSETTINGS: { to: '/fleet/settings', menuKey: 'fleetSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.fleet',
    order: FLEET_MENU_ORDER,
    subItems: [{ labelKey: 'nav.fleetSettings', to: '/fleet/settings', menuKey: 'fleetSettings' }]
  })
}
