import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const MAINTENANCE_MENU_ORDER = 40

export function registerMaintenanceModule(): void {
  registerFeatureRoutes({
    WORKORDER: { to: '/maintenance/work-orders', menuKey: 'workOrder' },
    DOWNTIME: { to: '/maintenance/downtimes', menuKey: 'downtime' },
    TECHNICIAN: { to: '/maintenance/technicians', menuKey: 'technician' },
    COMPETENCE: { to: '/maintenance/competences', menuKey: 'competence' },
    FAILURECODE: { to: '/maintenance/failure-codes', menuKey: 'failureCode' },
    DOWNTIMECODE: { to: '/maintenance/downtime-codes', menuKey: 'downtimeCode' },
    MISSIONTYPE: { to: '/maintenance/mission-types', menuKey: 'missionType' },
    MAINTENANCESETTINGS: { to: '/maintenance/settings', menuKey: 'maintenanceSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.maintenance',
    order: MAINTENANCE_MENU_ORDER,
    subItems: [
      { labelKey: 'nav.workOrders', to: '/maintenance/work-orders', menuKey: 'workOrder' },
      { labelKey: 'nav.downtimes', to: '/maintenance/downtimes', menuKey: 'downtime' },
      { labelKey: 'nav.technicians', to: '/maintenance/technicians', menuKey: 'technician' },
      { labelKey: 'nav.competences', to: '/maintenance/competences', menuKey: 'competence' },
      { labelKey: 'nav.failureCodes', to: '/maintenance/failure-codes', menuKey: 'failureCode' },
      { labelKey: 'nav.downtimeCodes', to: '/maintenance/downtime-codes', menuKey: 'downtimeCode' },
      { labelKey: 'nav.missionTypes', to: '/maintenance/mission-types', menuKey: 'missionType' },
      {
        labelKey: 'nav.maintenanceSettings',
        to: '/maintenance/settings',
        menuKey: 'maintenanceSettings'
      }
    ]
  })
}
