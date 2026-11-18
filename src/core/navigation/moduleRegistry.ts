import type { Component } from 'vue'
import type { UserMenu } from '@/types/auth.types'

export interface NavSubItem {
  labelKey: string
  to: string
  /** Sidebar section, as an i18n key. */
  group?: string
  icon?: Component
  /** Shown only when userMenu[menuKey] is true. */
  menuKey?: string
  /** Screens gathered behind this entry: it stays active on any of them. */
  children?: NavSubItem[]
}

export interface NavMenuItem {
  labelKey: string
  /** Direct link for a single-page menu. */
  to?: string
  menuKey?: string
  /** Lower comes first. */
  order: number
  subItems: NavSubItem[]
}

const navMenus: NavMenuItem[] = []

/** Registering the same labelKey twice merges the sub-items into the existing menu. */
export function registerNavMenu(menu: NavMenuItem): void {
  const existing = navMenus.find((item) => item.labelKey === menu.labelKey)
  if (existing) existing.subItems.push(...menu.subItems)
  else navMenus.push({ ...menu, subItems: [...menu.subItems] })
  navMenus.sort((a, b) => a.order - b.order)
}

export function getNavMenus(): readonly NavMenuItem[] {
  return navMenus
}

/** The reference data of every module is gathered in one menu, placed ahead of the modules. */
export const REFERENTIAL_MENU_KEY = 'nav.referential'
export const REFERENTIAL_MENU_ORDER = 8
/** The data every module reads: vehicles, drivers, route templates. */
export const BASE_DATA_GROUP = 'nav.group.baseData'

export function registerReferentialItems(group: string, items: readonly NavSubItem[]): void {
  if (!items.length) return
  registerNavMenu({
    labelKey: REFERENTIAL_MENU_KEY,
    order: REFERENTIAL_MENU_ORDER,
    subItems: items.map((item) => ({ ...item, group }))
  })
}

/**
 * Registers the menu of a module. The base data it lists (`baseData`, by address) and its settings
 * screens leave it for the reference menu, so each piece of data is maintained in one place.
 */
export function registerModuleMenu(
  menu: NavMenuItem,
  options: { settingsGroup: string; baseData?: readonly string[] }
): void {
  const baseData = new Set(options.baseData ?? [])
  const isBaseData = (item: NavSubItem) => baseData.has(item.to)
  const isSettings = (item: NavSubItem) => item.group === SETUP_GROUP
  registerNavMenu({
    ...menu,
    subItems: menu.subItems.filter((item) => !isBaseData(item) && !isSettings(item))
  })
  registerReferentialItems(BASE_DATA_GROUP, menu.subItems.filter(isBaseData))
  registerReferentialItems(options.settingsGroup, menu.subItems.filter(isSettings))
}

function isVisible(menuKey: string | undefined, userMenu: UserMenu): boolean {
  return !menuKey || userMenu[menuKey] === true
}

/** The settings and reference lists of a module, gathered behind a single entry. */
export const SETUP_GROUP = 'nav.group.setup'
const SETUP_ICON_KEY = 'nav.setupHub'

/** The page that lists the settings of a module, from the address of its first screen. */
export function setupHubPath(items: readonly NavSubItem[]): string | null {
  const segment = items[0]?.to.split('/')[1]
  return segment ? `/${segment}/configuration` : null
}

function collapseSetup(menu: NavMenuItem): NavMenuItem {
  const setup = menu.subItems.filter((item) => item.group === SETUP_GROUP)
  const to = setupHubPath(setup)
  if (setup.length < 2 || !to) return menu
  const hub: NavSubItem = {
    labelKey: SETUP_ICON_KEY,
    to,
    group: SETUP_GROUP,
    icon: setup.find((item) => item.icon)?.icon,
    children: setup
  }
  const first = menu.subItems.indexOf(setup[0]!)
  const others = menu.subItems.filter((item) => item.group !== SETUP_GROUP)
  return { ...menu, subItems: [...others.slice(0, first), hub, ...others.slice(first)] }
}

/** Menus the user may see; nothing is shown until the permissions are known. */
export function visibleNavMenus(
  menus: readonly NavMenuItem[],
  userMenu: UserMenu | null
): NavMenuItem[] {
  if (!userMenu) return []
  return menus
    .map((menu) => ({
      ...menu,
      subItems: menu.subItems.filter((item) => isVisible(item.menuKey, userMenu))
    }))
    .filter((menu) => (menu.to ? isVisible(menu.menuKey, userMenu) : menu.subItems.length > 0))
    .map(collapseSetup)
}

export function clearNavMenus(): void {
  navMenus.length = 0
}
