import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const PLANNING_MENU_ORDER = 35

export function registerPlanningModule(): void {
  registerFeatureRoutes({
    CUSTOMER: { to: '/planning/customers', menuKey: 'customer' },
    DELIVERYPOINT: { to: '/planning/delivery-points', menuKey: 'deliveryPoint' },
    PRODUCT: { to: '/planning/products', menuKey: 'product' },
    PLANNINGREASON: { to: '/planning/reasons', menuKey: 'planningReason' },
    PLANNINGSETTINGS: { to: '/planning/settings', menuKey: 'planningSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.planning',
    order: PLANNING_MENU_ORDER,
    subItems: [
      { labelKey: 'nav.customers', to: '/planning/customers', menuKey: 'customer' },
      {
        labelKey: 'nav.deliveryPoints',
        to: '/planning/delivery-points',
        menuKey: 'deliveryPoint'
      },
      { labelKey: 'nav.products', to: '/planning/products', menuKey: 'product' },
      { labelKey: 'nav.planningReasons', to: '/planning/reasons', menuKey: 'planningReason' },
      { labelKey: 'nav.planningSettings', to: '/planning/settings', menuKey: 'planningSettings' }
    ]
  })
}
