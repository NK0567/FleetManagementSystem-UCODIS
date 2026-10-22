import { computed, toRef, type ComputedRef, type Ref } from 'vue'
import type { ListFilter } from '@/core/types/crud.types'
import { getAppliedListFilters } from '@/core/utils/listFilters'

/** Reopens the filter panel when filters are applied and counts them for the toolbar badge. */
export function useFilterPanelOpen(store: {
  filterPanelOpen: boolean
  userFilters: ListFilter[]
}): {
  showFilterPanel: Ref<boolean>
  appliedFilterCount: ComputedRef<number>
} {
  const showFilterPanel = toRef(store, 'filterPanelOpen')
  const userFilters = toRef(store, 'userFilters')
  const appliedFilterCount = computed(() => getAppliedListFilters(userFilters.value ?? []).length)

  if (showFilterPanel.value || appliedFilterCount.value > 0) {
    showFilterPanel.value = true
  }

  return { showFilterPanel, appliedFilterCount }
}
