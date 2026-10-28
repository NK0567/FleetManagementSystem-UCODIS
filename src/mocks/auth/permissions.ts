import { normalizeFeatureKey } from '@/core/navigation/featureRoutes'
import type { PermissionAction, UserPermissionRow, UserProfileCode } from '@/types/auth.types'
import { ROLE_PERMISSIONS } from '../fixtures/auth/rolePermissions'
import { MODULE_TOGGLE_CATALOG, type ModuleToggleRow } from '../fixtures/settings/moduleToggles'

export function disabledFeatures(toggles: readonly ModuleToggleRow[]): Set<string> {
  const inactive = new Set(toggles.filter((toggle) => !toggle.active).map((toggle) => toggle.no))
  return new Set(
    MODULE_TOGGLE_CATALOG.filter((toggle) => inactive.has(toggle.no)).flatMap(
      (toggle) => toggle.features
    )
  )
}

export function permissionsFor(
  profile: UserProfileCode,
  disabled: ReadonlySet<string> = new Set()
): UserPermissionRow[] {
  return Object.entries(ROLE_PERMISSIONS[profile])
    .filter(([feature]) => !disabled.has(normalizeFeatureKey(feature)))
    .map(([feature, { actions, myOnly }]) => ({
      feature,
      read: actions.includes('read'),
      insert: actions.includes('insert'),
      update: actions.includes('update'),
      delete: actions.includes('delete'),
      execute: actions.includes('execute'),
      export: actions.includes('export'),
      ...(myOnly ? { myOnly } : {})
    }))
}

export function hasPermission(
  rows: readonly UserPermissionRow[],
  feature: string,
  action: PermissionAction
): boolean {
  const key = normalizeFeatureKey(feature)
  return rows.some((row) => normalizeFeatureKey(row.feature) === key && row[action])
}

/** The user only sees and creates the records that concern them (their own leave, for instance). */
export function ownRecordsOnly(profile: UserProfileCode, feature: string): boolean {
  const key = normalizeFeatureKey(feature)
  return permissionsFor(profile).some(
    (row) => normalizeFeatureKey(row.feature) === key && row.myOnly === true
  )
}
