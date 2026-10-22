import { computed, onMounted, ref, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AxiosResponse } from 'axios'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { ListFilter, SortDirection } from '@/core/types/crud.types'
import type { ExportColumn } from '@/core/factories/useCrudState'
import {
  buildFilterFieldsFromColumns,
  inferCommonFilterMeta,
  overridesFromFilterDefs
} from '@/core/utils/buildFilterFieldsFromColumns'
import { useFilterPanelOpen } from '@/composables/useFilterPanelOpen'
import { useListCardRoute } from '@/composables/useListCardRoute'
import { useListExcelExport } from '@/composables/useListExcelExport'
import { useListPageBootstrap } from '@/composables/useListPageBootstrap'
import { useListToolbarCardActions } from '@/composables/useListToolbarCardActions'
import { usePermissions } from '@/composables/usePermissions'
import { useTableColumnPreferences } from '@/composables/useTableColumnPreferences'

/** The part of a store built on useCrudState that a list page relies on. */
export interface ListStore<T extends { no: string }, SearchCol extends string> {
  readonly items: T[]
  readonly selectedItem: T | null
  readonly pagination: { page: number; limit: number }
  filterPanelOpen: boolean
  userFilters: ListFilter[]
  fetchItems: (page?: number, pageSize?: number) => Promise<void>
  sortByColumn: (column: string, direction?: SortDirection) => Promise<void>
  setSearchColumn: (column: SearchCol) => Promise<void>
  setUserFilters: (filters: ListFilter[]) => Promise<void>
  getExportParams: (columns: ExportColumn[], fileBaseName?: string) => Record<string, unknown>
}

export interface UseListPageOptions<T extends { no: string }, SearchCol extends string> {
  /** Key of the saved column preferences. */
  tableId: string
  feature: string
  store: ListStore<T, SearchCol>
  columns: ComputedRef<TableColumn[]>
  /** Filters that need options or references; the others are guessed from the columns. */
  filterDefs?: FilterFieldDef[]
  exportFileBaseName: string
  exportApi: (body: Record<string, unknown>) => Promise<AxiosResponse<Blob>>
  remove?: (no: string) => Promise<void>
  deleteErrorFallback?: string
}

/**
 * Everything a standard list page wires around its store: permissions, column preferences,
 * filters, export, the card opened through ?no=, creation and deletion. The page keeps its own
 * template, so each list still reads like the P247 ones.
 */
export function useListPage<T extends { no: string }, SearchCol extends string>(
  options: UseListPageOptions<T, SearchCol>
) {
  const { t } = useI18n()
  const { store } = options
  const permissions = usePermissions(options.feature)
  const { showFilterPanel, appliedFilterCount } = useFilterPanelOpen(store)
  const showDetailsPanel = ref(false)

  const cardRoute = useListCardRoute()
  const { hideListContent, initCardBootstrapFromQuery, finishListBootstrap } = useListPageBootstrap(
    cardRoute.getQueryDocumentNo
  )

  const selectedItem = computed(() => store.selectedItem)
  const toolbarActions = useListToolbarCardActions({
    selectedItem,
    getItemNo: (item) => (item as T).no,
    canRead: permissions.canRead,
    canUpdate: permissions.canUpdate,
    openCard: cardRoute.openCard
  })

  const columnPreferences = useTableColumnPreferences(options.tableId, options.columns)

  /** Definitions matching a column refine its filter; the others add filters on hidden fields. */
  const filterFields = computed(() => {
    const columns = options.columns.value
    const defs = options.filterDefs ?? []
    const columnFields = new Set(columns.map((column) => column.field ?? column.sortKey))
    return buildFilterFieldsFromColumns(
      columns,
      overridesFromFilterDefs(defs),
      inferCommonFilterMeta,
      defs.filter((def) => !columnFields.has(def.field))
    )
  })

  const excelExport = useListExcelExport({
    feature: options.feature,
    fileBaseName: options.exportFileBaseName,
    columns: columnPreferences.visibleColumns,
    filterFields,
    exportApi: options.exportApi,
    getExportBody: (columns) => store.getExportParams(columns, options.exportFileBaseName)
  })

  const showCreateModal = ref(false)
  const showCreateSuccess = ref(false)

  function openCreateModal() {
    showCreateModal.value = true
  }

  function onCreated(created: T) {
    showCreateSuccess.value = true
    void store.fetchItems(store.pagination.page, store.pagination.limit)
    cardRoute.openCard(created.no, 'edit')
  }

  function closeCard() {
    cardRoute.closeCard()
    showCreateSuccess.value = false
  }

  function createFromCard() {
    closeCard()
    openCreateModal()
  }

  const itemToDelete = ref<T | null>(null)
  const deleting = ref(false)
  const deleteError = ref<string | null>(null)

  function askDelete(item: T) {
    deleteError.value = null
    itemToDelete.value = item
  }

  async function confirmDelete() {
    const item = itemToDelete.value
    if (!item || !options.remove) return
    deleting.value = true
    try {
      await options.remove(item.no)
      itemToDelete.value = null
      await store.fetchItems(store.pagination.page, store.pagination.limit)
    } catch (error) {
      itemToDelete.value = null
      deleteError.value = apiErrorMessage(
        error,
        options.deleteErrorFallback ?? t('common.error.unexpected')
      )
    } finally {
      deleting.value = false
    }
  }

  function onSort(sortKey: string, direction: SortDirection) {
    void store.sortByColumn(sortKey, direction)
  }

  function onSearchColumnChange(column: string) {
    void store.setSearchColumn(column as SearchCol)
  }

  function onUpdateUserFilters(filters: ListFilter[]) {
    void store.setUserFilters(filters)
  }

  /** Hidden columns keep their place after the visible ones. */
  function onReorderColumns(visibleOrder: string[]) {
    const rest = columnPreferences.orderSortKeys.value.filter((key) => !visibleOrder.includes(key))
    columnPreferences.setColumnOrder([...visibleOrder, ...rest])
  }

  onMounted(async () => {
    await store.fetchItems(1, store.pagination.limit)
    const queryNo = initCardBootstrapFromQuery()
    if (queryNo) {
      cardRoute.cardNo.value = queryNo
      cardRoute.cardOpenMode.value = cardRoute.getQueryOpenMode() ?? 'view'
      cardRoute.showCard.value = true
    } else {
      await finishListBootstrap()
    }
  })

  return {
    ...permissions,
    ...toolbarActions,
    ...columnPreferences,
    ...excelExport,
    showFilterPanel,
    appliedFilterCount,
    showDetailsPanel,
    hideListContent,
    cardNo: cardRoute.cardNo,
    showCard: cardRoute.showCard,
    cardOpenMode: cardRoute.cardOpenMode,
    closeCard,
    filterFields,
    showCreateModal,
    showCreateSuccess,
    openCreateModal,
    onCreated,
    createFromCard,
    itemToDelete,
    deleting,
    deleteError,
    askDelete,
    confirmDelete,
    onSort,
    onSearchColumnChange,
    onUpdateUserFilters,
    onReorderColumns
  }
}
