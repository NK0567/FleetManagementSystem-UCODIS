import { afterEach, describe, expect, it } from 'vitest'
import {
  buildUserMenu,
  clearFeatureRoutes,
  findFeatureForPath,
  normalizeFeatureKey,
  registerFeatureRoutes
} from './featureRoutes'
import {
  BASE_DATA_GROUP,
  clearNavMenus,
  getNavMenus,
  registerModuleMenu,
  registerNavMenu,
  SETUP_GROUP,
  visibleNavMenus
} from './moduleRegistry'
import { resolveLandingPath } from './landing'
import type { UserPermissionRow } from '@/types/auth.types'

function permission(feature: string, read = true): UserPermissionRow {
  return {
    feature,
    read,
    insert: false,
    update: false,
    delete: false,
    execute: false,
    export: false
  }
}

afterEach(() => {
  clearFeatureRoutes()
  clearNavMenus()
})

describe('featureRoutes', () => {
  it('normalizes feature codes', () => {
    expect(normalizeFeatureKey(' leave_request ')).toBe('LEAVEREQUEST')
  })

  it('finds the feature guarding a path, preferring the longest prefix', () => {
    registerFeatureRoutes({
      HRDASHBOARD: { to: '/hr', menuKey: 'hrDashboard' },
      EMPLOYEE: { to: '/hr/employees', menuKey: 'employee' }
    })

    expect(findFeatureForPath('/hr/employees')).toBe('EMPLOYEE')
    expect(findFeatureForPath('/hr/employees/UCT-001')).toBe('EMPLOYEE')
    expect(findFeatureForPath('/hr')).toBe('HRDASHBOARD')
    expect(findFeatureForPath('/hr/employees-archive')).toBe('HRDASHBOARD')
    expect(findFeatureForPath('/login')).toBeUndefined()
  })

  it('builds the user menu from readable features only', () => {
    registerFeatureRoutes({
      EMPLOYEE: { to: '/hr/employees', menuKey: 'employee' },
      LEAVEREQUEST: { to: '/hr/leave-requests', menuKey: 'leaveRequest' }
    })

    expect(
      buildUserMenu([permission('EMPLOYEE'), permission('LEAVEREQUEST', false), permission('X')])
    ).toEqual({ employee: true })
  })
})

describe('moduleRegistry', () => {
  it('merges menus registered with the same label and keeps them ordered', () => {
    registerNavMenu({ labelKey: 'nav.fleet', order: 20, subItems: [] })
    registerNavMenu({
      labelKey: 'nav.hr',
      order: 10,
      subItems: [{ labelKey: 'nav.employees', to: '/hr/employees' }]
    })
    registerNavMenu({
      labelKey: 'nav.hr',
      order: 10,
      subItems: [{ labelKey: 'nav.orgUnits', to: '/hr/org-units' }]
    })

    expect(getNavMenus().map((menu) => menu.labelKey)).toEqual(['nav.hr', 'nav.fleet'])
    expect(getNavMenus()[0]?.subItems).toHaveLength(2)
  })

  it('hides everything until permissions are loaded, then filters by menu key', () => {
    const menus = [
      {
        labelKey: 'nav.hr',
        order: 10,
        subItems: [
          { labelKey: 'nav.employees', to: '/hr/employees', menuKey: 'employee' },
          { labelKey: 'nav.orgUnits', to: '/hr/org-units', menuKey: 'orgUnit' }
        ]
      },
      { labelKey: 'nav.settings', order: 90, subItems: [] }
    ]

    expect(visibleNavMenus(menus, null)).toEqual([])
    const visible = visibleNavMenus(menus, { employee: true })
    expect(visible).toHaveLength(1)
    expect(visible[0]?.subItems.map((item) => item.to)).toEqual(['/hr/employees'])
  })
})

describe('resolveLandingPath', () => {
  const menus = [
    {
      labelKey: 'nav.hr',
      order: 10,
      subItems: [
        { labelKey: 'nav.dashboard', to: '/hr' },
        { labelKey: 'nav.employees', to: '/hr/employees' }
      ]
    }
  ]

  it('opens the preferred page when allowed', () => {
    expect(resolveLandingPath({ preferred: '/hr/employees', menus, canOpen: () => true })).toBe(
      '/hr/employees'
    )
  })

  it('falls back to the first page the user may open', () => {
    const canOpen = (path: string) => path === '/hr/employees'
    expect(resolveLandingPath({ preferred: '/planning', menus, canOpen })).toBe('/hr/employees')
  })

  it('falls back to home when nothing can be opened', () => {
    expect(resolveLandingPath({ preferred: '/hr', menus, canOpen: () => false })).toBe('/')
  })
})

describe('reference menu', () => {
  const fleetMenu = {
    labelKey: 'nav.fleet',
    order: 30,
    subItems: [
      { labelKey: 'nav.fleetDashboard', to: '/fleet/dashboard', group: 'nav.group.overview' },
      { labelKey: 'nav.vehicles', to: '/fleet/vehicles', group: 'nav.group.vehicles' },
      { labelKey: 'nav.couplings', to: '/fleet/couplings', group: 'nav.group.vehicles' },
      { labelKey: 'nav.sites', to: '/fleet/sites', group: SETUP_GROUP }
    ]
  }

  it('gathers the base data and the settings of every module, ahead of the modules', () => {
    registerModuleMenu(fleetMenu, {
      settingsGroup: 'nav.group.refFleet',
      baseData: ['/fleet/vehicles']
    })
    registerModuleMenu(
      {
        labelKey: 'nav.maintenance',
        order: 40,
        subItems: [
          {
            labelKey: 'nav.workOrders',
            to: '/maintenance/work-orders',
            group: 'nav.group.workshop'
          },
          { labelKey: 'nav.technicians', to: '/maintenance/technicians', group: SETUP_GROUP }
        ]
      },
      { settingsGroup: 'nav.group.refMaintenance' }
    )

    const menus = getNavMenus()
    expect(menus.map((menu) => menu.labelKey)).toEqual([
      'nav.referential',
      'nav.fleet',
      'nav.maintenance'
    ])
    const [reference, fleet] = menus
    expect(reference?.subItems.map((item) => [item.to, item.group])).toEqual([
      ['/fleet/vehicles', BASE_DATA_GROUP],
      ['/fleet/sites', 'nav.group.refFleet'],
      ['/maintenance/technicians', 'nav.group.refMaintenance']
    ])
    // What stays in the module is its daily work: the coupling remains with the fleet.
    expect(fleet?.subItems.map((item) => item.to)).toEqual(['/fleet/dashboard', '/fleet/couplings'])
  })

  it('shows nothing of the reference menu to a user who may read none of it', () => {
    registerModuleMenu(
      {
        ...fleetMenu,
        subItems: fleetMenu.subItems.map((item, index) => ({ ...item, menuKey: `k${index}` }))
      },
      { settingsGroup: 'nav.group.refFleet', baseData: ['/fleet/vehicles'] }
    )

    expect(visibleNavMenus(getNavMenus(), { k0: true }).map((menu) => menu.labelKey)).toEqual([
      'nav.fleet'
    ])
    expect(visibleNavMenus(getNavMenus(), { k3: true }).map((menu) => menu.labelKey)).toEqual([
      'nav.referential'
    ])
  })
})
