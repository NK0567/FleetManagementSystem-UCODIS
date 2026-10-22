import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/core/api/authApi'
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/api/httpClient'
import { buildUserMenu, normalizeFeatureKey } from '@/core/navigation/featureRoutes'
import { getNavMenus, visibleNavMenus, type NavMenuItem } from '@/core/navigation/moduleRegistry'
import { dedupeInFlight } from '@/core/utils/inFlightRequests'
import type { PermissionsMap, UserMenu, UserPermissionRow } from '@/types/auth.types'

function buildPermissionsMap(rows: UserPermissionRow[]): PermissionsMap {
  const map: PermissionsMap = {}
  for (const row of rows) {
    const feature = normalizeFeatureKey(row.feature)
    if (!feature) continue
    const existing = map[feature]
    map[feature] = {
      insert: Boolean(existing?.insert || row.insert),
      update: Boolean(existing?.update || row.update),
      read: Boolean(existing?.read || row.read),
      delete: Boolean(existing?.delete || row.delete),
      execute: Boolean(existing?.execute || row.execute),
      export: Boolean(existing?.export || row.export)
    }
  }
  return map
}

export const useMenuPermissionsStore = defineStore('menuPermissions', () => {
  const permissionsList = ref<UserPermissionRow[] | null>(null)

  const loaded = computed(() => permissionsList.value !== null)
  const userMenu = computed<UserMenu | null>(() =>
    permissionsList.value ? buildUserMenu(permissionsList.value) : null
  )
  const permissionsMap = computed<PermissionsMap>(() =>
    permissionsList.value ? buildPermissionsMap(permissionsList.value) : {}
  )
  const navMenus = computed<NavMenuItem[]>(() => visibleNavMenus(getNavMenus(), userMenu.value))

  function can(feature: string, action: keyof PermissionsMap[string] = 'read'): boolean {
    return permissionsMap.value[normalizeFeatureKey(feature)]?.[action] === true
  }

  async function fetchPermissions(): Promise<void> {
    if (!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) return
    return dedupeInFlight('auth:permissions', async () => {
      try {
        const response = await authApi.getPermissions()
        if (response.data.success && Array.isArray(response.data.data)) {
          permissionsList.value = response.data.data
        }
      } catch {
        // The previous permissions stay in place; the guard retries on the next navigation.
      }
    })
  }

  /** Loads the permissions once per session; later calls are free. */
  async function ensureLoaded(): Promise<void> {
    if (!loaded.value) await fetchPermissions()
  }

  function clear(): void {
    permissionsList.value = null
  }

  return {
    permissionsList,
    loaded,
    userMenu,
    permissionsMap,
    navMenus,
    can,
    fetchPermissions,
    ensureLoaded,
    clear
  }
})
