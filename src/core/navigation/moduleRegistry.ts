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

function isVisible(menuKey: string | undefined, userMenu: UserMenu): boolean {
  return !menuKey || userMenu[menuKey] === true
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
}

export function clearNavMenus(): void {
  navMenus.length = 0
}
