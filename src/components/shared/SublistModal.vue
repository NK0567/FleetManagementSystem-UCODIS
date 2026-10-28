<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import type { SearchColumnOption } from '@/components/shared/SearchBar.vue'
import { useTableColumnPreferences } from '@/composables/useTableColumnPreferences'
import { createLatestRequest, isCanceledRequest } from '@/core/utils/latestRequest'

type AnyItem = Record<string, unknown>

export interface SublistColumn {
  key: string
  label: string
  width?: string
  formatter?: (value: unknown, item: unknown) => string
}

export interface SublistFetchParams {
  page: number
  pageSize: number
  searchQuery?: string
  searchColumn?: string
  sortBy?: string
  sortDirection?: 'ASC' | 'DESC'
  /** Cancels the request when a newer search replaces it. */
  signal?: AbortSignal
}

export interface SublistFetchResult {
  items: AnyItem[]
  meta: { total: number; page: number; totalPages: number }
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    columns: SublistColumn[]
    fetchFn: (params: SublistFetchParams) => Promise<SublistFetchResult>
    pageSize?: number
    preferencesTableId?: string
    searchColumnOptions?: SearchColumnOption[]
    showCreateButton?: boolean
    refreshTrigger?: number
    /** Rows can be selected and confirmed (lookup mode). */
    selectable?: boolean
    valueKey?: string
    modelValue?: string
    /** Nothing is fetched until the user submits a search of `searchMinLength` characters. */
    requireSearch?: boolean
    searchMinLength?: number
  }>(),
  {
    title: '',
    pageSize: 10,
    preferencesTableId: 'sublist-modal',
    searchColumnOptions: () => [],
    showCreateButton: false,
    refreshTrigger: 0,
    selectable: false,
    valueKey: 'code',
    modelValue: '',
    requireSearch: false,
    searchMinLength: 0
  }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  create: []
  select: [item: AnyItem]
  cancel: []
  'open-item': [item: AnyItem]
}>()

const { t } = useI18n()

const tableColumns = computed<TableColumn[]>(() =>
  props.columns.map((column, index) => ({
    sortKey: column.key,
    field: column.key,
    label: column.label,
    minW: column.width ?? '120px',
    ...(column.formatter ? { formatter: column.formatter } : {}),
    ...(index === 0 && !props.selectable ? { cell: 'link' as const } : {})
  }))
)

const {
  visibleColumns,
  visibleSortKeys,
  orderSortKeys,
  pinnedSortKeys,
  stickyColumnCount,
  setColumnVisible,
  setColumnPinned,
  setColumnOrder,
  reorderVisibleColumns,
  setColumnWidth,
  resetPreferences,
  isColumnVisible,
  isColumnPinned
} = useTableColumnPreferences(props.preferencesTableId, tableColumns)

const searchColumn = ref('')
const searchQuery = ref('')
const sortBy = ref<string | null>(null)
const sortDirection = ref<'ASC' | 'DESC'>('ASC')
const loadedItems = ref<AnyItem[]>([])
const page = ref(1)
const limit = ref(props.pageSize)
const totalPages = ref(1)
const totalItems = ref(0)
const loading = ref(false)
const selectedCode = ref('')
const hasAttemptedSearch = ref(false)
const sublistRequest = createLatestRequest()

function queryMeetsMinLength(query = searchQuery.value): boolean {
  return query.trim().length >= props.searchMinLength
}

function resetSearchResults() {
  loadedItems.value = []
  totalItems.value = 0
  totalPages.value = 1
  hasAttemptedSearch.value = false
  sublistRequest.cancel()
}

const emptyMessage = computed(() => {
  if (props.requireSearch && !hasAttemptedSearch.value) {
    return t(
      'common.lookup.searchMinLengthHint',
      { min: Math.max(props.searchMinLength, 1) },
      Math.max(props.searchMinLength, 1)
    )
  }
  return t('common.noResults')
})

const selectedItem = computed(() => {
  if (!props.selectable || !selectedCode.value) return null
  return (
    loadedItems.value.find((item) => String(item[props.valueKey] ?? '') === selectedCode.value) ??
    null
  )
})

const effectiveSearchColumnOptions = computed(() =>
  props.searchColumnOptions.length > 0
    ? props.searchColumnOptions
    : props.columns.map((column) => ({ value: column.key, label: column.label }))
)

async function loadData() {
  if (!props.visible) return
  if (props.requireSearch && !queryMeetsMinLength()) return
  const request = sublistRequest.start()
  loading.value = true
  try {
    const result = await props.fetchFn({
      page: page.value,
      pageSize: limit.value,
      searchQuery: searchQuery.value || undefined,
      searchColumn: searchColumn.value || undefined,
      sortBy: sortBy.value ?? undefined,
      sortDirection: sortDirection.value,
      signal: request.signal
    })
    if (!request.isCurrent()) return
    hasAttemptedSearch.value = true
    loadedItems.value = result.items ?? []
    totalItems.value = result.meta?.total ?? 0
    totalPages.value = Math.max(1, result.meta?.totalPages ?? 1)
    page.value = result.meta?.page ?? page.value
  } catch (error) {
    if (isCanceledRequest(error) || !request.isCurrent()) return
    throw error
  } finally {
    if (request.isCurrent()) loading.value = false
  }
}

function onSearch(query: string) {
  searchQuery.value = query
  page.value = 1
  if (props.requireSearch && !queryMeetsMinLength(query)) {
    resetSearchResults()
    return
  }
  void loadData()
}

function onClearSearch() {
  searchQuery.value = ''
  page.value = 1
  if (props.requireSearch) {
    resetSearchResults()
    return
  }
  void loadData()
}

function onSearchColumnChange(column: string) {
  searchColumn.value = column
  if (!searchQuery.value.trim()) return
  page.value = 1
  if (props.requireSearch) {
    resetSearchResults()
    return
  }
  void loadData()
}

function onSort(nextSortBy: string, nextSortDirection: 'ASC' | 'DESC') {
  sortBy.value = nextSortBy
  sortDirection.value = nextSortDirection
  page.value = 1
  void loadData()
}

function onPageChange(nextPage: number) {
  page.value = nextPage
  void loadData()
}

function onLimitChange(nextLimit: number) {
  limit.value = nextLimit
  page.value = 1
  void loadData()
}

function close() {
  emit('update:visible', false)
}

function cancelSelection() {
  emit('cancel')
  close()
}

function onSelectItem(item: unknown) {
  if (!props.selectable) return
  selectedCode.value = String((item as AnyItem)[props.valueKey] ?? '')
}

function confirmSelection() {
  if (!props.selectable || !selectedItem.value) return
  emit('select', selectedItem.value)
  close()
}

function onRowDblclick(item: unknown) {
  if (props.selectable) {
    onSelectItem(item)
    confirmSelection()
  } else {
    emit('open-item', item as AnyItem)
  }
}

function onBackdropClick(event: MouseEvent) {
  if ((event.target as HTMLElement).dataset.backdrop) close()
}

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    searchQuery.value = ''
    sortBy.value = null
    sortDirection.value = 'ASC'
    searchColumn.value = effectiveSearchColumnOptions.value[0]?.value ?? ''
    if (props.selectable) selectedCode.value = props.modelValue ?? ''
    limit.value = props.pageSize
    page.value = 1
    if (props.requireSearch) {
      resetSearchResults()
      return
    }
    void loadData()
  }
)

watch(
  () => props.pageSize,
  (value) => {
    limit.value = value
  }
)

watch(
  () => props.refreshTrigger,
  () => {
    if (!props.visible) return
    page.value = 1
    void loadData()
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        data-backdrop="true"
        class="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-3"
        @mousedown="onBackdropClick"
      >
        <div
          class="bg-card rounded-lg shadow-2xl border border-border w-full max-w-[min(72rem,calc(100vw-1.5rem))] max-h-[88vh] flex flex-col overflow-hidden"
          @mousedown.stop
        >
          <div
            class="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-muted/30 shrink-0"
          >
            <div class="flex items-center gap-3 min-w-0">
              <h2 class="text-base font-semibold text-card-foreground truncate">{{ title }}</h2>
              <span v-if="!loading" class="text-xs text-muted-foreground shrink-0">
                {{ t('common.lookup.resultCount', { count: totalItems }, totalItems) }}
              </span>
            </div>
            <button
              type="button"
              class="p-1.5 hover:bg-accent rounded transition text-muted-foreground"
              :aria-label="t('common.close')"
              @click="close"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <ListPageToolbar
            title=""
            :show-filter-panel="false"
            :show-details-panel="false"
            :show-create="showCreateButton"
            :show-list-view="false"
            :show-filter-toggle="false"
            :show-details-toggle="false"
            :show-export-excel="false"
            :search-expanded-by-default="true"
            :search-column="searchColumn"
            :search-query="searchQuery"
            :column-options="effectiveSearchColumnOptions"
            :search-loading="loading"
            @create="emit('create')"
            @search="onSearch"
            @clear="onClearSearch"
            @update:search-column="onSearchColumnChange"
          >
            <template #column-picker>
              <TableColumnPicker
                :all-columns="tableColumns"
                :order-sort-keys="orderSortKeys"
                :visible-sort-keys="visibleSortKeys"
                :pinned-sort-keys="pinnedSortKeys"
                :is-column-visible="isColumnVisible"
                :is-column-pinned="isColumnPinned"
                :set-column-visible="setColumnVisible"
                :set-column-pinned="setColumnPinned"
                :set-column-order="setColumnOrder"
                :reset-preferences="resetPreferences"
              />
            </template>
          </ListPageToolbar>

          <div class="flex-1 min-h-0 flex flex-col">
            <ListPageLayout
              :filter-panel-open="false"
              :table-columns="visibleColumns"
              :sticky-column-count="stickyColumnCount"
              :resizable="true"
              :reorderable="true"
              :on-reorder-columns="reorderVisibleColumns"
              :sort-by="sortBy"
              :sort-direction="sortDirection"
              :loading="loading"
              :loading-text="t('common.loading')"
              :items="loadedItems"
              :row-key="visibleColumns[0]?.field ?? visibleColumns[0]?.sortKey ?? 'id'"
              :selected-item="selectable ? selectedItem : null"
              :error="null"
              :search-query="hasAttemptedSearch ? searchQuery || null : null"
              :no-results-message="emptyMessage"
              :no-search-results-message="t('common.noSearchResults', { query: searchQuery })"
              :page="page"
              :total-pages="Math.max(1, totalPages)"
              :total="totalItems"
              :limit="limit"
              :show-details-panel="false"
              @sort="onSort"
              @update:width="setColumnWidth"
              @update:page="onPageChange"
              @update:limit="onLimitChange"
              @select-item="onSelectItem"
              @row-dblclick="onRowDblclick"
              @primary-cell-click="
                (item) => {
                  if (!selectable) emit('open-item', item as AnyItem)
                }
              "
            >
              <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps ?? {}" />
              </template>
            </ListPageLayout>
          </div>

          <div
            v-if="selectable"
            class="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30 shrink-0"
          >
            <span class="text-xs text-muted-foreground">
              {{
                t(
                  'common.lookup.displayedCount',
                  { shown: loadedItems.length, total: totalItems },
                  loadedItems.length
                )
              }}
            </span>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="px-5 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!selectedCode"
                @click="confirmSelection"
              >
                {{ t('common.confirm') }}
              </button>
              <button
                type="button"
                class="px-5 py-1.5 text-sm font-medium border border-border rounded text-card-foreground hover:bg-accent transition"
                @click="cancelSelection"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
:deep(.table-scroll-container) {
  min-height: 460px;
}
</style>
