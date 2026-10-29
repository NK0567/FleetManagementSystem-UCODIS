import type { UserMenu, UserPermissionRow } from '@/types/auth.types'

export function normalizeFeatureKey(feature: string): string {
  return feature.trim().toUpperCase().replace(/_/g, '')
}

export interface FeatureRoute {
  /** Route of the feature's main page. */
  to: string
  /** Key checked by navigation items (see moduleRegistry). */
  menuKey: string
}

const featureRoutes = new Map<string, FeatureRoute>()

/** Called by each module to declare which feature guards which page. */
export function registerFeatureRoutes(routes: Record<string, FeatureRoute>): void {
  for (const [feature, route] of Object.entries(routes)) {
    featureRoutes.set(normalizeFeatureKey(feature), route)
  }
}

export function getFeatureRoute(feature: string): FeatureRoute | undefined {
  return featureRoutes.get(normalizeFeatureKey(feature))
}

function isUnder(path: string, base: string): boolean {
  return path === base || path.startsWith(base.endsWith('/') ? base : `${base}/`)
}

/** Feature guarding a path: the registered route with the longest matching prefix. */
export function findFeatureForPath(path: string): string | undefined {
  let match: { feature: string; length: number } | undefined
  for (const [feature, route] of featureRoutes) {
    if (isUnder(path, route.to) && (!match || route.to.length > match.length)) {
      match = { feature, length: route.to.length }
    }
  }
  return match?.feature
}

export function buildUserMenu(rows: UserPermissionRow[]): UserMenu {
  const menu: UserMenu = {}
  for (const row of rows) {
    if (!row.read || row.menu === false) continue
    const route = getFeatureRoute(row.feature)
    if (route) menu[route.menuKey] = true
  }
  return menu
}

export function clearFeatureRoutes(): void {
  featureRoutes.clear()
}
