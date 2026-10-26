import { ClipboardList, FileText, Users } from '@lucide/vue'
import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'
import { registerSearchableEntity } from '@/core/search/searchRegistry'
import { customerService, type CustomerApi } from './customers'
import { deliveryRequestService, type DeliveryRequestApi } from './delivery-requests'
import { transportOrderService, type TransportOrderApi } from './transport-orders'

const PLANNING_MENU_ORDER = 35

export function registerPlanningModule(): void {
  registerFeatureRoutes({
    DELIVERYREQUEST: { to: '/planning/delivery-requests', menuKey: 'deliveryRequest' },
    TRANSPORTORDER: { to: '/planning/transport-orders', menuKey: 'transportOrder' },
    CUSTOMERCONFIRMATION: { to: '/planning/confirmations', menuKey: 'customerConfirmation' },
    LOADING: { to: '/planning/loading', menuKey: 'loading' },
    DELIVERYQUALITY: { to: '/planning/delivery-quality', menuKey: 'deliveryQuality' },
    CUSTOMERBILLING: { to: '/planning/customer-billing', menuKey: 'customerBilling' },
    CARRIERINVOICE: { to: '/planning/carrier-invoices', menuKey: 'carrierInvoice' },
    FUELTOUR: { to: '/planning/fuel-tours', menuKey: 'fuelTour' },
    PLANNINGDASHBOARD: { to: '/planning/dashboard', menuKey: 'planningDashboard' },
    TRANSPORTREPORT: { to: '/planning/reports', menuKey: 'transportReport' },
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
      { labelKey: 'nav.loading', to: '/planning/loading', menuKey: 'loading' },
      {
        labelKey: 'nav.deliveryQuality',
        to: '/planning/delivery-quality',
        menuKey: 'deliveryQuality'
      },
      {
        labelKey: 'nav.customerBilling',
        to: '/planning/customer-billing',
        menuKey: 'customerBilling'
      },
      {
        labelKey: 'nav.carrierInvoices',
        to: '/planning/carrier-invoices',
        menuKey: 'carrierInvoice'
      },
      { labelKey: 'nav.fuelTours', to: '/planning/fuel-tours', menuKey: 'fuelTour' },
      {
        labelKey: 'nav.planningDashboard',
        to: '/planning/dashboard',
        menuKey: 'planningDashboard'
      },
      { labelKey: 'nav.transportReports', to: '/planning/reports', menuKey: 'transportReport' },
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

  registerSearchableEntity({
    key: 'transportOrder',
    feature: 'TRANSPORTORDER',
    labelKey: 'planning.transportOrders.title',
    icon: ClipboardList,
    basePath: '/planning/transport-orders',
    searchColumns: 'no,routeName,recipientSummary,carrierName,tripNo',
    service: transportOrderService,
    toHit: (order: TransportOrderApi) => ({
      id: order.no,
      title: order.no,
      subtitle: [order.recipientSummary, order.routeName, order.tripNo].filter(Boolean).join(' · ')
    })
  })

  registerSearchableEntity({
    key: 'deliveryRequest',
    feature: 'DELIVERYREQUEST',
    labelKey: 'planning.deliveryRequests.title',
    icon: FileText,
    basePath: '/planning/delivery-requests',
    searchColumns: 'no,ordererName,deliveryPointName,externalReference',
    service: deliveryRequestService,
    toHit: (request: DeliveryRequestApi) => ({
      id: request.no,
      title: request.no,
      subtitle: [request.ordererName, request.deliveryPointName, request.externalReference]
        .filter(Boolean)
        .join(' · ')
    })
  })

  registerSearchableEntity({
    key: 'customer',
    feature: 'CUSTOMER',
    labelKey: 'planning.customers.title',
    icon: Users,
    basePath: '/planning/customers',
    searchColumns: 'no,name,city,contactName',
    service: customerService,
    toHit: (customer: CustomerApi) => ({
      id: customer.no,
      title: customer.name,
      subtitle: [customer.no, customer.city].filter(Boolean).join(' · ')
    })
  })
}
