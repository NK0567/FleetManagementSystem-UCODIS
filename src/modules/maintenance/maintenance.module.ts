import {
  Award,
  Briefcase,
  Bug,
  CalendarClock,
  CalendarOff,
  CircleDot,
  CirclePause,
  ClipboardCheck,
  Gauge,
  Grid3x3,
  HardHat,
  LayoutDashboard,
  ListChecks,
  Package,
  PackageSearch,
  Settings2,
  ShoppingCart,
  TriangleAlert,
  Truck,
  Users,
  Wrench
} from '@lucide/vue'
import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'
import { registerSearchableEntity } from '@/core/search/searchRegistry'
import { stockItemService, type StockItemApi } from './stock-items'
import { tyreService, type TyreApi } from './tyres'
import { workOrderService, type WorkOrderApi } from './work-orders'

const MAINTENANCE_MENU_ORDER = 40

export function registerMaintenanceModule(): void {
  registerFeatureRoutes({
    MAINTENANCEDASHBOARD: { to: '/maintenance/dashboard', menuKey: 'maintenanceDashboard' },
    RELIABILITY: { to: '/maintenance/reliability', menuKey: 'reliability' },
    WORKORDER: { to: '/maintenance/work-orders', menuKey: 'workOrder' },
    SERVICEDUE: { to: '/maintenance/service-due', menuKey: 'serviceDue' },
    WORKSHOPLOAD: { to: '/maintenance/workshop-load', menuKey: 'workshopLoad' },
    VEHICLECHECK: { to: '/maintenance/vehicle-checks', menuKey: 'vehicleCheck' },
    MOBILEINTERVENTION: { to: '/maintenance/mobile-interventions', menuKey: 'mobileIntervention' },
    TYRE: { to: '/maintenance/tyres', menuKey: 'tyre' },
    TYRELAYOUT: { to: '/maintenance/tyre-layouts', menuKey: 'tyreLayout' },
    DOWNTIME: { to: '/maintenance/downtimes', menuKey: 'downtime' },
    STOCKITEM: { to: '/maintenance/stock-items', menuKey: 'stockItem' },
    PURCHASEREQUEST: { to: '/maintenance/purchase-requests', menuKey: 'purchaseRequest' },
    TECHNICIAN: { to: '/maintenance/technicians', menuKey: 'technician' },
    COMPETENCE: { to: '/maintenance/competences', menuKey: 'competence' },
    FAILURECODE: { to: '/maintenance/failure-codes', menuKey: 'failureCode' },
    DOWNTIMECODE: { to: '/maintenance/downtime-codes', menuKey: 'downtimeCode' },
    MISSIONTYPE: { to: '/maintenance/mission-types', menuKey: 'missionType' },
    VEHICLECHECKPOINT: { to: '/maintenance/vehicle-check-points', menuKey: 'vehicleCheckPoint' },
    MAINTENANCEPLAN: { to: '/maintenance/maintenance-plans', menuKey: 'maintenancePlan' },
    MAINTENANCESETTINGS: { to: '/maintenance/settings', menuKey: 'maintenanceSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.maintenance',
    order: MAINTENANCE_MENU_ORDER,
    subItems: [
      {
        labelKey: 'nav.maintenanceDashboard',
        to: '/maintenance/dashboard',
        group: 'nav.group.overview',
        icon: LayoutDashboard,
        menuKey: 'maintenanceDashboard'
      },
      {
        labelKey: 'nav.workOrders',
        to: '/maintenance/work-orders',
        group: 'nav.group.workshop',
        icon: Wrench,
        menuKey: 'workOrder'
      },
      {
        labelKey: 'nav.serviceDue',
        to: '/maintenance/service-due',
        group: 'nav.group.workshop',
        icon: TriangleAlert,
        menuKey: 'serviceDue'
      },
      {
        labelKey: 'nav.workshopLoad',
        to: '/maintenance/workshop-load',
        group: 'nav.group.workshop',
        icon: Users,
        menuKey: 'workshopLoad'
      },
      {
        labelKey: 'nav.vehicleChecks',
        to: '/maintenance/vehicle-checks',
        group: 'nav.group.workshop',
        icon: ClipboardCheck,
        menuKey: 'vehicleCheck'
      },
      {
        labelKey: 'nav.mobileInterventions',
        to: '/maintenance/mobile-interventions',
        group: 'nav.group.workshop',
        icon: Truck,
        menuKey: 'mobileIntervention'
      },
      {
        labelKey: 'nav.tyres',
        to: '/maintenance/tyres',
        group: 'nav.group.assets',
        icon: CircleDot,
        menuKey: 'tyre'
      },
      {
        labelKey: 'nav.maintenancePlans',
        to: '/maintenance/maintenance-plans',
        group: 'nav.group.assets',
        icon: CalendarClock,
        menuKey: 'maintenancePlan'
      },
      {
        labelKey: 'nav.downtimes',
        to: '/maintenance/downtimes',
        group: 'nav.group.workshop',
        icon: CalendarOff,
        menuKey: 'downtime'
      },
      {
        labelKey: 'nav.stockItems',
        to: '/maintenance/stock-items',
        group: 'nav.group.purchasing',
        icon: PackageSearch,
        menuKey: 'stockItem'
      },
      {
        labelKey: 'nav.reliability',
        to: '/maintenance/reliability',
        group: 'nav.group.overview',
        icon: Gauge,
        menuKey: 'reliability'
      },
      {
        labelKey: 'nav.purchaseRequests',
        to: '/maintenance/purchase-requests',
        group: 'nav.group.purchasing',
        icon: ShoppingCart,
        menuKey: 'purchaseRequest'
      },
      {
        labelKey: 'nav.technicians',
        to: '/maintenance/technicians',
        group: 'nav.group.setup',
        icon: HardHat,
        menuKey: 'technician'
      },
      {
        labelKey: 'nav.competences',
        to: '/maintenance/competences',
        group: 'nav.group.setup',
        icon: Award,
        menuKey: 'competence'
      },
      {
        labelKey: 'nav.failureCodes',
        to: '/maintenance/failure-codes',
        group: 'nav.group.setup',
        icon: Bug,
        menuKey: 'failureCode'
      },
      {
        labelKey: 'nav.downtimeCodes',
        to: '/maintenance/downtime-codes',
        group: 'nav.group.setup',
        icon: CirclePause,
        menuKey: 'downtimeCode'
      },
      {
        labelKey: 'nav.missionTypes',
        to: '/maintenance/mission-types',
        group: 'nav.group.setup',
        icon: Briefcase,
        menuKey: 'missionType'
      },
      {
        labelKey: 'nav.vehicleCheckPoints',
        to: '/maintenance/vehicle-check-points',
        group: 'nav.group.setup',
        icon: ListChecks,
        menuKey: 'vehicleCheckPoint'
      },
      {
        labelKey: 'nav.tyreLayouts',
        to: '/maintenance/tyre-layouts',
        group: 'nav.group.setup',
        icon: Grid3x3,
        menuKey: 'tyreLayout'
      },
      {
        labelKey: 'nav.maintenanceSettings',
        to: '/maintenance/settings',
        group: 'nav.group.setup',
        icon: Settings2,
        menuKey: 'maintenanceSettings'
      }
    ]
  })

  registerSearchableEntity({
    key: 'workOrder',
    feature: 'WORKORDER',
    labelKey: 'maintenance.workOrders.title',
    icon: Wrench,
    basePath: '/maintenance/work-orders',
    searchColumns: 'no,vehiclePlate,symptom',
    service: workOrderService,
    toHit: (order: WorkOrderApi) => ({
      id: order.no,
      title: `${order.no} · ${order.vehiclePlate}`,
      subtitle: order.symptom
    })
  })

  registerSearchableEntity({
    key: 'tyre',
    feature: 'TYRE',
    labelKey: 'maintenance.tyres.title',
    icon: CircleDot,
    basePath: '/maintenance/tyres',
    searchColumns: 'no,serialNumber,make,vehiclePlate',
    service: tyreService,
    toHit: (tyre: TyreApi) => ({
      id: tyre.no,
      title: `${tyre.serialNumber} · ${tyre.make}`,
      subtitle: [tyre.no, tyre.vehiclePlate, tyre.positionCode].filter(Boolean).join(' · ')
    })
  })

  registerSearchableEntity({
    key: 'stockItem',
    feature: 'STOCKITEM',
    labelKey: 'maintenance.stockItems.title',
    icon: Package,
    basePath: '/maintenance/stock-items',
    searchColumns: 'no,name',
    service: stockItemService,
    toHit: (item: StockItemApi) => ({
      id: item.no,
      title: item.name,
      subtitle: [item.no, item.supplierName].filter(Boolean).join(' · ')
    })
  })
}
