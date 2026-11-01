import { describe, expect, it } from 'vitest'
import { SETUP_GROUP, visibleNavMenus, type NavMenuItem } from './moduleRegistry'

const menu: NavMenuItem = {
  labelKey: 'nav.fleet',
  order: 1,
  subItems: [
    { labelKey: 'nav.vehicles', to: '/fleet/vehicles', group: 'nav.group.vehicles', menuKey: 'v' },
    { labelKey: 'nav.sites', to: '/fleet/sites', group: SETUP_GROUP, menuKey: 's' },
    { labelKey: 'nav.vehicleTypes', to: '/fleet/vehicle-types', group: SETUP_GROUP, menuKey: 't' },
    { labelKey: 'nav.fleetSettings', to: '/fleet/settings', group: SETUP_GROUP, menuKey: 'x' }
  ]
}

describe('settings gathered behind one entry', () => {
  it('replaces the settings entries by one page that lists those the user may open', () => {
    const [fleet] = visibleNavMenus([menu], { v: true, s: true, t: true })
    expect(fleet?.subItems.map((item) => item.to)).toEqual([
      '/fleet/vehicles',
      '/fleet/configuration'
    ])
    expect(fleet?.subItems[1]?.children?.map((item) => item.to)).toEqual([
      '/fleet/sites',
      '/fleet/vehicle-types'
    ])
  })

  it('keeps a single settings entry as it is', () => {
    const [fleet] = visibleNavMenus([menu], { v: true, s: true })
    expect(fleet?.subItems.map((item) => item.to)).toEqual(['/fleet/vehicles', '/fleet/sites'])
  })
})
