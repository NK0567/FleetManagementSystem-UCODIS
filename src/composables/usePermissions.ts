import { computed } from 'vue'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'
import { normalizeFeatureKey } from '@/core/navigation/featureRoutes'

export function usePermissions(feature: string) {
  const store = useMenuPermissionsStore()
  const key = normalizeFeatureKey(feature)
  const permission = computed(() => store.permissionsMap[key])

  return {
    canInsert: computed(() => permission.value?.insert === true),
    canUpdate: computed(() => permission.value?.update === true),
    canRead: computed(() => permission.value?.read === true),
    canDelete: computed(() => permission.value?.delete === true),
    canExecute: computed(() => permission.value?.execute === true),
    canExport: computed(() => permission.value?.export === true),
    /** Limited to the records that concern the user (their own leave, for instance). */
    myOnly: computed(
      () =>
        store.permissionsList?.some(
          (row) => normalizeFeatureKey(row.feature) === key && row.myOnly === true
        ) ?? false
    )
  }
}
