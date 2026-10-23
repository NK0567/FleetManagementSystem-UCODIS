import { ref, watch, type Ref } from 'vue'
import i18n from '@/core/i18n'
import type { PaginationMeta } from '@/types/api-response.types'
import type { CrudStateOptions, ListFilter, SortDirection } from '@/core/types/crud.types'
import { getAppliedListFilters } from '@/core/utils/listFilters'
import { loadPersistedListState, savePersistedListState } from '@/core/utils/listStateStorage'
import { applyListAccessScope } from '@/core/listAccessScope'
import { createLatestRequest, isCanceledRequest } from '@/core/utils/latestRequest'

export interface ExportColumn {
  field?: string
  sortKey: string
  label: string
  align?: string
}

const DEFAULT_PAGE_SIZE = 25
const EXPORT_PAGE_SIZE = 100

/**
 * Reactive state and actions of a standard list + card module (search, sort, filters, paging,
 * selection, card loading). Meant to be spread inside a Pinia setup store.
 */
export function useCrudState<T extends { no: string }, SearchCol extends string = string>(
  options: CrudStateOptions<T, SearchCol>
) {
  const {
    service,
    defaultSearchColumn,
    entityLabelKey,
    getListFilters,
    listAccessScope,
    defaultSortBy,
    defaultSortDirection,
    persistKey,
    defaultUserFilters = []
  } = options

  const persisted = persistKey ? loadPersistedListState(persistKey) : null
  const { t } = i18n.global

  const items = ref([]) as Ref<T[]>
  const selectedItem = ref(null) as Ref<T | null>
  const currentItem = ref(null) as Ref<T | null>
  const currentItemLoading = ref(false)
  const currentItemError = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const searchColumn = ref(defaultSearchColumn) as Ref<SearchCol>
  const sortBy = ref<string | null>(defaultSortBy ?? null)
  const sortDirection = ref<SortDirection>(defaultSortDirection ?? 'ASC')
  const userFilters = ref<ListFilter[]>(persisted?.userFilters ?? defaultUserFilters)
  const filterPanelOpen = ref(persisted?.filterPanelOpen ?? false)
  const pagination = ref<PaginationMeta>({
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalPages: 0
  })

  if (persistKey) {
    watch(
      [userFilters, filterPanelOpen],
      () => {
        savePersistedListState(persistKey, {
          userFilters: userFilters.value,
          filterPanelOpen: filterPanelOpen.value
        })
      },
      { deep: true, flush: 'sync' }
    )
  }

  const resolveAppliedFilters = (): ListFilter[] =>
    getAppliedListFilters(
      applyListAccessScope([...(getListFilters?.() ?? []), ...userFilters.value], listAccessScope)
    )

  const listQuery = () => {
    const filters = resolveAppliedFilters()
    return {
      searchQuery: searchQuery.value || undefined,
      searchColumns: searchColumn.value,
      sortBy: sortBy.value ?? undefined,
      sortDirection: sortBy.value ? sortDirection.value : undefined,
      ...(filters.length > 0 && { filters })
    }
  }

  // Search, sort, paging and filters all go through here, so a newer request cancels the older one.
  const listRequest = createLatestRequest()

  const fetchItems = async (page = 1, pageSize = pagination.value.limit) => {
    const request = listRequest.start()
    loading.value = true
    error.value = null
    try {
      const response = await service.getAll({
        page,
        pageSize,
        ...listQuery(),
        signal: request.signal
      })
      if (!request.isCurrent()) return
      items.value = response.data.items
      pagination.value = response.data.meta
    } catch (e) {
      if (isCanceledRequest(e) || !request.isCurrent()) return
      error.value = t('common.error.loadList', { entity: t(entityLabelKey) })
    } finally {
      if (request.isCurrent()) loading.value = false
    }
  }

  const sortByColumn = async (column: string, direction?: SortDirection) => {
    sortDirection.value =
      direction ?? (sortBy.value === column && sortDirection.value === 'ASC' ? 'DESC' : 'ASC')
    sortBy.value = column
    await fetchItems(pagination.value.page)
  }

  const selectItem = (item: T | null) => {
    selectedItem.value = item
  }

  const changePage = async (page: number) => {
    await fetchItems(page)
  }

  const changeLimit = async (limit: number) => {
    pagination.value.limit = limit
    await fetchItems(1, limit)
  }

  const search = async (query: string) => {
    searchQuery.value = query
    await fetchItems(1)
  }

  const setSearchColumn = async (column: SearchCol) => {
    searchColumn.value = column
    if (searchQuery.value) await fetchItems(1)
  }

  const clearSearch = async () => {
    searchQuery.value = ''
    await fetchItems(1)
  }

  const resetFilters = async () => {
    searchQuery.value = ''
    searchColumn.value = defaultSearchColumn
    sortBy.value = defaultSortBy ?? null
    sortDirection.value = defaultSortDirection ?? 'ASC'
    userFilters.value = defaultUserFilters
    filterPanelOpen.value = false
    await fetchItems(1)
  }

  const setUserFilters = async (filters: ListFilter[]) => {
    userFilters.value = filters
    await fetchItems(1)
  }

  /** Current list parameters for POST <basePath>/export. */
  const getExportParams = (columns: ExportColumn[], fileBaseName?: string) => ({
    ...listQuery(),
    columns: columns.map((column) => ({
      field: (column.field ?? column.sortKey).trim(),
      label: column.label,
      ...(column.align === 'right' ? { align: 'right' as const } : {})
    })),
    ...(fileBaseName ? { fileBaseName } : {})
  })

  const fetchAllItems = async (): Promise<T[]> => {
    const all: T[] = []
    let page = 1
    let totalPages = 1
    do {
      const response = await service.getAll({ page, pageSize: EXPORT_PAGE_SIZE, ...listQuery() })
      all.push(...response.data.items)
      totalPages = response.data.meta.totalPages
      page++
    } while (page <= totalPages)
    return all
  }

  const getItemFromList = (no: string): T | undefined => items.value.find((item) => item.no === no)

  const setCurrentItem = (item: T | null) => {
    currentItem.value = item
    currentItemLoading.value = false
    currentItemError.value = null
  }

  /** `silent` refreshes in the background without showing the card loader. */
  const fetchItemById = async (no: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (!silent) currentItemLoading.value = true
    currentItemError.value = null
    try {
      currentItem.value = await service.getById(no)
    } catch {
      currentItemError.value = t('common.error.loadCard')
    } finally {
      if (!silent) currentItemLoading.value = false
    }
  }

  return {
    items,
    selectedItem,
    currentItem,
    currentItemLoading,
    currentItemError,
    loading,
    error,
    pagination,
    searchQuery,
    searchColumn,
    sortBy,
    sortDirection,
    userFilters,
    filterPanelOpen,
    fetchItems,
    fetchAllItems,
    getExportParams,
    fetchItemById,
    sortByColumn,
    selectItem,
    changePage,
    changeLimit,
    search,
    setSearchColumn,
    clearSearch,
    resetFilters,
    setUserFilters,
    getItemFromList,
    setCurrentItem
  }
}
