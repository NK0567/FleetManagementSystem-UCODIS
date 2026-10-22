import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const HR_MENU_ORDER = 10

export function registerHrModule(): void {
  registerFeatureRoutes({
    HRDASHBOARD: { to: '/hr/dashboard', menuKey: 'hrDashboard' },
    MYPLANNING: { to: '/hr/my-planning', menuKey: 'myPlanning' },
    LEAVEREQUEST: { to: '/hr/leave-requests', menuKey: 'leaveRequest' },
    LEAVEBALANCE: { to: '/hr/leave-balances', menuKey: 'leaveBalance' },
    EMPLOYEE: { to: '/hr/employees', menuKey: 'employee' },
    ORGUNIT: { to: '/hr/org-units', menuKey: 'orgUnit' },
    JOBPOSITION: { to: '/hr/job-positions', menuKey: 'jobPosition' },
    EMPLOYEECATEGORY: { to: '/hr/employee-categories', menuKey: 'employeeCategory' },
    LEAVETYPE: { to: '/hr/leave-types', menuKey: 'leaveType' },
    WORKINGCALENDAR: { to: '/hr/working-calendar', menuKey: 'workingCalendar' },
    PUBLICHOLIDAY: { to: '/hr/public-holidays', menuKey: 'publicHoliday' }
  })

  registerNavMenu({
    labelKey: 'nav.hr',
    order: HR_MENU_ORDER,
    subItems: [
      { labelKey: 'nav.hrDashboard', to: '/hr/dashboard', menuKey: 'hrDashboard' },
      { labelKey: 'nav.myPlanning', to: '/hr/my-planning', menuKey: 'myPlanning' },
      { labelKey: 'nav.employees', to: '/hr/employees', menuKey: 'employee' },
      { labelKey: 'nav.leaveRequests', to: '/hr/leave-requests', menuKey: 'leaveRequest' },
      { labelKey: 'nav.leaveBalances', to: '/hr/leave-balances', menuKey: 'leaveBalance' },
      { labelKey: 'nav.orgUnits', to: '/hr/org-units', menuKey: 'orgUnit' },
      { labelKey: 'nav.jobPositions', to: '/hr/job-positions', menuKey: 'jobPosition' },
      {
        labelKey: 'nav.employeeCategories',
        to: '/hr/employee-categories',
        menuKey: 'employeeCategory'
      },
      { labelKey: 'nav.leaveTypes', to: '/hr/leave-types', menuKey: 'leaveType' },
      {
        labelKey: 'nav.workingCalendar',
        to: '/hr/working-calendar',
        menuKey: 'workingCalendar'
      },
      { labelKey: 'nav.publicHolidays', to: '/hr/public-holidays', menuKey: 'publicHoliday' }
    ]
  })
}
