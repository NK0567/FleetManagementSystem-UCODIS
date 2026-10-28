import type { ListAccessScopeOptions, ListFilter } from '@/core/types/crud.types'
import { currentUserCode, currentUserOrgUnitNo } from '@/core/factories/viewAsFilters'
import { normalizeFeatureKey } from '@/core/navigation/featureRoutes'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'
import type { UserPermissionRow } from '@/types/auth.types'

export type ListAccessRestriction = 'owner' | 'team' | null

export function collectPermissionRowsForFeatures(
  rows: UserPermissionRow[] | null | undefined,
  features: string[]
): UserPermissionRow[] {
  if (!rows?.length || !features.length) return []
  const keys = new Set(features.map(normalizeFeatureKey).filter(Boolean))
  return rows.filter((row) => keys.has(normalizeFeatureKey(row.feature)))
}

/** "My only" wins over "my team". */
export function resolveListAccessRestriction(
  rows: UserPermissionRow[] | null | undefined
): ListAccessRestriction {
  if (!rows?.length) return null
  if (rows.some((row) => row.myOnly)) return 'owner'
  if (rows.some((row) => row.myTeam)) return 'team'
  return null
}

export function buildListAccessScopeFilters(options: {
  restriction: ListAccessRestriction
  ownerField: string
  ownerValue?: string
  teamField?: string
  teamValue?: string
}): ListFilter[] {
  const owner = (options.ownerValue ?? currentUserCode()).trim()
  const ownerFilter: ListFilter[] = owner
    ? [{ field: options.ownerField, valueType: 'string', value: owner }]
    : []

  if (options.restriction === 'owner') return ownerFilter
  if (options.restriction === 'team') {
    const team = (options.teamValue ?? currentUserOrgUnitNo()).trim()
    if (team && options.teamField) {
      return [{ field: options.teamField, valueType: 'string', value: team }]
    }
    return ownerFilter
  }
  return []
}

/** Enforces the access filters: a user filter on the same field with another value is dropped. */
export function mergeListAccessScopeFilters(
  filters: ListFilter[],
  scope: ListFilter[]
): ListFilter[] {
  if (!scope.length) return filters
  const kept = filters.filter((filter) => {
    const scoped = scope.find((entry) => entry.field === filter.field)
    return !scoped || String(scoped.value) === String(filter.value)
  })
  const missing = scope.filter(
    (entry) =>
      !kept.some(
        (filter) => filter.field === entry.field && String(filter.value) === String(entry.value)
      )
  )
  return [...kept, ...missing]
}

export function applyListAccessScope(
  filters: ListFilter[],
  scope: ListAccessScopeOptions | undefined
): ListFilter[] {
  if (!scope) return filters
  const rows = collectPermissionRowsForFeatures(useMenuPermissionsStore().permissionsList, [
    scope.feature,
    ...(scope.extraFeatures ?? [])
  ])
  const scopeFilters = buildListAccessScopeFilters({
    restriction: resolveListAccessRestriction(rows),
    ownerField: scope.ownerField,
    ownerValue: scope.ownerValue?.(),
    teamField: scope.teamField,
    teamValue: scope.teamValue?.()
  })
  return mergeListAccessScopeFilters(filters, scopeFilters)
}
