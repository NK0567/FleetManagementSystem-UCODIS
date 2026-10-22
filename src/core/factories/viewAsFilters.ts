import { computed, type ComputedRef, type Ref } from 'vue'
import type { ListFilter } from '@/core/types/crud.types'
import { useUserStore } from '@/stores/user'

/**
 * Turns predefined list views ("All", "Pending", ...) into real rows of `userFilters`, so the user
 * can tweak them in the filter panel and the active view is detected back from the filters.
 */
export function makeViewAsFilters<V extends string>(options: {
  userFilters: Ref<ListFilter[]>
  setUserFilters: (next: ListFilter[]) => Promise<void>
  managedFields: readonly string[]
  buildViewFilters: (view: V) => ListFilter[]
  detect: (filters: ListFilter[]) => V
}) {
  const { userFilters, setUserFilters, managedFields, buildViewFilters, detect } = options

  const listView: ComputedRef<V> = computed(() => detect(userFilters.value))

  const setListView = async (view: V): Promise<void> => {
    const others = userFilters.value.filter((filter) => !managedFields.includes(filter.field))
    await setUserFilters([...others, ...buildViewFilters(view)])
  }

  return { listView, setListView }
}

export function currentUserCode(): string {
  return useUserStore().user?.code?.trim() ?? ''
}

export function currentUserOrgUnitNo(): string {
  return useUserStore().user?.orgUnitNo?.trim() ?? ''
}

export function hasFilterEq(filters: ListFilter[], field: string, value: unknown): boolean {
  return filters.some((filter) => filter.field === field && String(filter.value) === String(value))
}
