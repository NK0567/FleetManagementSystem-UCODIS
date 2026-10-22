import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const HR_MENU_ORDER = 10

export function registerHrModule(): void {
  registerFeatureRoutes({
    JOBPOSITION: { to: '/hr/job-positions', menuKey: 'jobPosition' },
    EMPLOYEECATEGORY: { to: '/hr/employee-categories', menuKey: 'employeeCategory' },
    LEAVETYPE: { to: '/hr/leave-types', menuKey: 'leaveType' },
    PUBLICHOLIDAY: { to: '/hr/public-holidays', menuKey: 'publicHoliday' }
  })

  registerNavMenu({
    labelKey: 'nav.hr',
    order: HR_MENU_ORDER,
    subItems: [
      { labelKey: 'nav.jobPositions', to: '/hr/job-positions', menuKey: 'jobPosition' },
      {
        labelKey: 'nav.employeeCategories',
        to: '/hr/employee-categories',
        menuKey: 'employeeCategory'
      },
      { labelKey: 'nav.leaveTypes', to: '/hr/leave-types', menuKey: 'leaveType' },
      { labelKey: 'nav.publicHolidays', to: '/hr/public-holidays', menuKey: 'publicHoliday' }
    ]
  })
}
