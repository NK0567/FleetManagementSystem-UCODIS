import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const PLANNING_MENU_ORDER = 35

export function registerPlanningModule(): void {
  registerFeatureRoutes({
    PLANNINGREASON: { to: '/planning/reasons', menuKey: 'planningReason' },
    PLANNINGSETTINGS: { to: '/planning/settings', menuKey: 'planningSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.planning',
    order: PLANNING_MENU_ORDER,
    subItems: [
      { labelKey: 'nav.planningReasons', to: '/planning/reasons', menuKey: 'planningReason' },
      { labelKey: 'nav.planningSettings', to: '/planning/settings', menuKey: 'planningSettings' }
    ]
  })
}
