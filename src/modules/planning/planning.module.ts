import {
  BadgeDollarSign,
  CalendarDays,
  Building,
  ClipboardList,
  FileChartColumn,
  FileSpreadsheet,
  FileText,
  Inbox,
  Layers,
  LayoutDashboard,
  MapPinned,
  MessageSquareWarning,
  MessageSquareX,
  Package2,
  PackageCheck,
  PhoneCall,
  ReceiptText,
  Scale,
  Settings2,
  Truck,
  Users
} from '@lucide/vue'
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
    LOADINGPLAN: { to: '/planning/loading-preparations', menuKey: 'loadingPreparation' },
    DELIVERYQUALITY: { to: '/planning/delivery-quality', menuKey: 'deliveryQuality' },
    CUSTOMERBILLING: { to: '/planning/customer-billing', menuKey: 'customerBilling' },
    CARRIERINVOICE: { to: '/planning/carrier-invoices', menuKey: 'carrierInvoice' },
    PLANNINGCALENDAR: { to: '/planning/calendar', menuKey: 'planningCalendar' },
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
        labelKey: 'nav.deliveryRequests',
        to: '/planning/delivery-requests',
        group: 'nav.group.orders',
        icon: Inbox,
        menuKey: 'deliveryRequest'
      },
      {
        labelKey: 'nav.transportOrders',
        to: '/planning/transport-orders',
        group: 'nav.group.orders',
        icon: Truck,
        menuKey: 'transportOrder'
      },
      {
        labelKey: 'nav.planningCalendar',
        to: '/planning/calendar',
        group: 'nav.group.orders',
        icon: CalendarDays,
        menuKey: 'planningCalendar'
      },
      {
        labelKey: 'nav.customerConfirmations',
        to: '/planning/confirmations',
        group: 'nav.group.execution',
        icon: PhoneCall,
        menuKey: 'customerConfirmation'
      },
      {
        labelKey: 'nav.loadingPreparations',
        to: '/planning/loading-preparations',
        group: 'nav.group.execution',
        icon: Layers,
        menuKey: 'loadingPreparation'
      },
      {
        labelKey: 'nav.loading',
        to: '/planning/loading',
        group: 'nav.group.execution',
        icon: PackageCheck,
        menuKey: 'loading'
      },
      {
        labelKey: 'nav.deliveryQuality',
        to: '/planning/delivery-quality',
        group: 'nav.group.execution',
        icon: MessageSquareWarning,
        menuKey: 'deliveryQuality'
      },
      {
        labelKey: 'nav.customerBilling',
        to: '/planning/customer-billing',
        group: 'nav.group.billing',
        icon: ReceiptText,
        menuKey: 'customerBilling'
      },
      {
        labelKey: 'nav.carrierInvoices',
        to: '/planning/carrier-invoices',
        group: 'nav.group.billing',
        icon: FileSpreadsheet,
        menuKey: 'carrierInvoice'
      },
      {
        labelKey: 'nav.planningDashboard',
        to: '/planning/dashboard',
        group: 'nav.group.overview',
        icon: LayoutDashboard,
        menuKey: 'planningDashboard'
      },
      {
        labelKey: 'nav.transportReports',
        to: '/planning/reports',
        group: 'nav.group.overview',
        icon: FileChartColumn,
        menuKey: 'transportReport'
      },
      {
        labelKey: 'nav.customers',
        to: '/planning/customers',
        group: 'nav.group.setup',
        icon: Building,
        menuKey: 'customer'
      },
      {
        labelKey: 'nav.deliveryPoints',
        to: '/planning/delivery-points',
        group: 'nav.group.setup',
        icon: MapPinned,
        menuKey: 'deliveryPoint'
      },
      {
        labelKey: 'nav.products',
        to: '/planning/products',
        group: 'nav.group.setup',
        icon: Package2,
        menuKey: 'product'
      },
      {
        labelKey: 'nav.productCompatibilities',
        to: '/planning/product-compatibilities',
        group: 'nav.group.setup',
        icon: Layers,
        menuKey: 'productCompatibility'
      },
      {
        labelKey: 'nav.quantityTolerances',
        to: '/planning/quantity-tolerances',
        group: 'nav.group.setup',
        icon: Scale,
        menuKey: 'quantityTolerance'
      },
      {
        labelKey: 'nav.transportTariffs',
        to: '/planning/transport-tariffs',
        group: 'nav.group.setup',
        icon: BadgeDollarSign,
        menuKey: 'transportTariff'
      },
      {
        labelKey: 'nav.planningReasons',
        to: '/planning/reasons',
        group: 'nav.group.setup',
        icon: MessageSquareX,
        menuKey: 'planningReason'
      },
      {
        labelKey: 'nav.planningSettings',
        to: '/planning/settings',
        group: 'nav.group.setup',
        icon: Settings2,
        menuKey: 'planningSettings'
      }
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
