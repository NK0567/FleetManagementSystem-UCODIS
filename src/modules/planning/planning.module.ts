import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const PLANNING_MENU_ORDER = 35

export function registerPlanningModule(): void {
  registerFeatureRoutes({
    DELIVERYREQUEST: { to: '/planning/delivery-requests', menuKey: 'deliveryRequest' },
    TRANSPORTORDER: { to: '/planning/transport-orders', menuKey: 'transportOrder' },
    CUSTOMERCONFIRMATION: { to: '/planning/confirmations', menuKey: 'customerConfirmation' },
    CUSTOMER: { to: '/planning/customers', menuKey: 'customer' },
    DELIVERYPOINT: { to: '/planning/delivery-points', menuKey: 'deliveryPoint' },
    PRODUCT: { to: '/planning/products', menuKey: 'product' },
    PRODUCTCOMPATIBILITY: {
      to: '/planning/product-compatibilities',
      menuKey: 'productCompatibility'
    },
    QUANTITYTOLERANCE: { to: '/planning/quantity-tolerances', menuKey: 'quantityTolerance' },
    TRANSPORTTARIFF: { to: '/planning/transport-tariffs', menuKey: 'transportTariff' },
    PLANNINGREASON: { to: '/planning/reasons', menuKey: 'planningReason' },
    PLANNINGSETTINGS: { to: '/planning/settings', menuKey: 'planningSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.planning',
    order: PLANNING_MENU_ORDER,
    subItems: [
      {
        labelKey: 'nav.transportOrders',
        to: '/planning/transport-orders',
        menuKey: 'transportOrder'
      },
      {
        labelKey: 'nav.customerConfirmations',
        to: '/planning/confirmations',
        menuKey: 'customerConfirmation'
      },
      {
        labelKey: 'nav.deliveryRequests',
        to: '/planning/delivery-requests',
        menuKey: 'deliveryRequest'
      },
      { labelKey: 'nav.customers', to: '/planning/customers', menuKey: 'customer' },
      {
        labelKey: 'nav.deliveryPoints',
        to: '/planning/delivery-points',
        menuKey: 'deliveryPoint'
      },
      { labelKey: 'nav.products', to: '/planning/products', menuKey: 'product' },
      {
        labelKey: 'nav.transportTariffs',
        to: '/planning/transport-tariffs',
        menuKey: 'transportTariff'
      },
      {
        labelKey: 'nav.productCompatibilities',
        to: '/planning/product-compatibilities',
        menuKey: 'productCompatibility'
      },
      {
        labelKey: 'nav.quantityTolerances',
        to: '/planning/quantity-tolerances',
        menuKey: 'quantityTolerance'
      },
      { labelKey: 'nav.planningReasons', to: '/planning/reasons', menuKey: 'planningReason' },
      { labelKey: 'nav.planningSettings', to: '/planning/settings', menuKey: 'planningSettings' }
    ]
  })
}
