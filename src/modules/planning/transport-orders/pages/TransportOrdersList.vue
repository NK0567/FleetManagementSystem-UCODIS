<script lang="ts" setup>
import { computed, ref } from 'vue'
import { Archive, ClipboardCheck, Columns3, ListChecks, PhoneCall } from '@lucide/vue'
import TransportOrdersBoard from '../components/TransportOrdersBoard.vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { transportOrderApi } from '../api/transportOrderApi'
import { useTransportOrderStore } from '../stores/transportOrderStore'
import type { TransportOrderApi, TransportOrderSearchColumn } from '../types/transportOrder.types'

const { t } = useI18n()
const store = useTransportOrderStore()
const { formatDateTime, formatDecimal, optionLabel } = useListCellFormatters()
const creatingFromRequests = ref(false)

const searchColumnOptions = computed<{ value: TransportOrderSearchColumn; label: string }[]>(() => [
  {
    value: 'no,routeName,recipientSummary,carrierName,tripNo',
    label: t('planning.transportOrders.search.all')
  },
  { value: 'no', label: t('planning.transportOrders.col.no') },
  { value: 'routeName', label: t('planning.transportOrders.col.routeName') },
  { value: 'recipientSummary', label: t('planning.transportOrders.col.recipientSummary') },
  { value: 'carrierName', label: t('planning.transportOrders.col.carrierName') },
  { value: 'tripNo', label: t('planning.transportOrders.col.tripNo') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('planning.transportOrders.col.no'), minW: '130px', cell: 'link' },
  {
    sortKey: 'status',
    label: t('planning.transportOrders.col.status'),
    minW: '120px',
    formatter: optionLabel('transportOrderStatus')
  },
  {
    sortKey: 'plannedDeparture',
    label: t('planning.transportOrders.col.plannedDeparture'),
    minW: '160px',
    formatter: formatDateTime
  },
  {
    sortKey: 'plannedArrival',
    label: t('planning.transportOrders.col.plannedArrival'),
    minW: '160px',
    defaultHidden: true,
    formatter: formatDateTime
  },
  { sortKey: 'routeName', label: t('planning.transportOrders.col.routeName'), minW: '240px' },
  {
    sortKey: 'means',
    label: t('planning.transportOrders.col.means'),
    minW: '130px',
    formatter: (value) =>
      value ? optionLabel('transportMeans')(value, {}) : t('planning.transportOrders.means.none')
  },
  {
    sortKey: 'recipientSummary',
    label: t('planning.transportOrders.col.recipientSummary'),
    minW: '220px'
  },
  {
    sortKey: 'lineCount',
    label: t('planning.transportOrders.col.lineCount'),
    minW: '90px',
    align: 'right'
  },
  {
    sortKey: 'totalWeightKg',
    label: t('planning.transportOrders.col.totalWeightKg'),
    minW: '110px',
    align: 'right',
    defaultHidden: true,
    formatter: formatDecimal
  },
  {
    sortKey: 'tripNo',
    label: t('planning.transportOrders.col.tripNo'),
    minW: '120px',
    defaultHidden: true
  },
  {
    sortKey: 'carrierName',
    label: t('planning.transportOrders.col.carrierName'),
    minW: '200px',
    defaultHidden: true
  },
  {
    sortKey: 'modifiedAt',
    label: t('common.audit.modifiedAt'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
  },
  { sortKey: 'modifiedBy', label: t('common.audit.modifiedBy'), minW: '110px', defaultHidden: true }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'status',
    labelKey: 'planning.transportOrders.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'transportOrderStatus'
  },
  {
    field: 'archived',
    labelKey: 'planning.transportOrders.view.archives',
    valueType: 'boolean',
    kind: 'boolean'
  },
  {
    field: 'awaitingClosing',
    labelKey: 'planning.transportOrders.view.awaitingClosing',
    valueType: 'boolean',
    kind: 'boolean'
  },
  {
    field: 'means',
    labelKey: 'planning.transportOrders.col.means',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'transportMeans'
  }
]

const detailKeys = [
  'status',
  'routeName',
  'plannedDeparture',
  'plannedArrival',
  'means',
  'lineCount',
  'totalWeightKg'
]
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: TransportOrderApi, column: TableColumn): string {
  return getListCellDisplay(
    (item as unknown as Record<string, unknown>)[column.sortKey],
    item,
    column
  )
}

const {
  canInsert,
  showFilterPanel,
  appliedFilterCount,
  showDetailsPanel,
  hideListContent,
  showCardActions,
  canViewSelected,
  canEditSelected,
  openSelectedView,
  openSelectedEdit,
  openFromList,
  visibleColumns,
  orderSortKeys,
  visibleSortKeys,
  pinnedSortKeys,
  stickyColumnCount,
  isColumnVisible,
  isColumnPinned,
  setColumnVisible,
  setColumnPinned,
  setColumnOrder,
  setColumnWidth,
  resetPreferences,
  filterFields,
  exportToExcel,
  exporting,
  exportError,
  canExport,
  cardNo,
  showCard,
  cardOpenMode,
  closeCard,
  showCreateModal,
  showCreateSuccess,
  openCreateModal,
  onCreated,
  createFromCard,
  onSort,
  onSearchColumnChange,
  onUpdateUserFilters,
  onReorderColumns
} = useListPage<TransportOrderApi, TransportOrderSearchColumn>({
  tableId: 'planning-transport-orders',
  feature: 'TRANSPORTORDER',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'transport-orders',
  exportApi: transportOrderApi.exportExcel
})

/** The « awaiting closing » view is a filter, not a status: orders in progress whose lines are all dealt with. */
const awaitingClosingView = computed(() =>
  store.userFilters.some((filter) => filter.field === 'awaitingClosing' && filter.value === true)
)
function toggleAwaitingClosing() {
  const others = store.userFilters.filter((filter) => filter.field !== 'awaitingClosing')
  onUpdateUserFilters(
    awaitingClosingView.value
      ? others
      : [...others, { field: 'awaitingClosing', valueType: 'boolean', value: true }]
  )
}

/* Completed orders are final and join the archives (TRS05-US06). */
const archivesView = computed(() =>
  store.userFilters.some((filter) => filter.field === 'archived' && filter.value === true)
)
function toggleArchives() {
  const others = store.userFilters.filter((filter) => filter.field !== 'archived')
  onUpdateUserFilters(
    archivesView.value
      ? others
      : [...others, { field: 'archived', valueType: 'boolean', value: true }]
  )
}

/* The board view (kanban), remembered for the viewer on this browser. */
const BOARD_KEY = 'planning.transportOrders.board'
const readBoard = () => {
  try {
    return localStorage.getItem(BOARD_KEY) === '1'
  } catch {
    return false
  }
}
const boardView = ref(readBoard())
const boardReload = ref(0)
function toggleBoard() {
  boardView.value = !boardView.value
  try {
    localStorage.setItem(BOARD_KEY, boardView.value ? '1' : '0')
  } catch {
    /* the view simply is not remembered */
  }
}

function onCreatedFromRequests(no: string) {
  creatingFromRequests.value = false
  void store.fetchItems(store.pagination.page, store.pagination.limit)
  openFromList(no)
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('planning.transportOrders.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-create="canInsert"
        :show-card-actions="showCardActions"
        :can-view-selected="canViewSelected"
        :can-edit-selected="canEditSelected"
        :show-list-view="false"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @toggle-filter="showFilterPanel = !showFilterPanel"
        @toggle-details="showDetailsPanel = !showDetailsPanel"
        @create="openCreateModal"
        @view="openSelectedView"
        @edit="openSelectedEdit"
        @search="store.search"
        @clear="store.clearSearch()"
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
        <template #extra-actions>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-accent border rounded transition"
            :class="
              boardView
                ? 'border-primary text-primary bg-primary/5'
                : 'border-border text-card-foreground'
            "
            :aria-pressed="boardView"
            @click="toggleBoard"
          >
            <Columns3 class="w-4 h-4 text-primary" />
            {{ t('planning.transportOrders.board.toggle') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-accent border rounded transition"
            :class="
              awaitingClosingView
                ? 'border-primary text-primary bg-primary/5'
                : 'border-border text-card-foreground'
            "
            :aria-pressed="awaitingClosingView"
            @click="toggleAwaitingClosing"
          >
            <ClipboardCheck class="w-4 h-4 text-primary" />
            {{ t('planning.transportOrders.view.awaitingClosing') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-accent border rounded transition"
            :class="
              archivesView
                ? 'border-primary text-primary bg-primary/5'
                : 'border-border text-card-foreground'
            "
            :aria-pressed="archivesView"
            @click="toggleArchives"
          >
            <Archive class="w-4 h-4 text-primary" />
            {{ t('planning.transportOrders.view.archives') }}
          </button>
          <button
            v-if="canInsert"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
            @click="creatingFromRequests = true"
          >
            <ListChecks class="w-4 h-4 text-primary" />
            {{ t('planning.transportOrders.createDialog.title') }}
          </button>
        </template>
      </ListPageToolbar>

      <FormAlerts class="mx-4" :error="exportError" @clear:error="exportError = null" />

      <TransportOrdersBoard
        v-if="boardView"
        :search="store.searchQuery"
        :reload-key="boardReload"
        @open="openFromList"
      />
      <ListPageLayout
        v-else
        :filter-panel-open="showFilterPanel"
        :table-columns="visibleColumns"
        :sticky-column-count="stickyColumnCount"
        :resizable="true"
        :reorderable="true"
        :on-reorder-columns="onReorderColumns"
        :sort-by="store.sortBy"
        :sort-direction="store.sortDirection"
        :loading="store.loading"
        :loading-text="t('planning.transportOrders.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('planning.transportOrders.noResults')"
        :no-search-results-message="
          t('planning.transportOrders.noSearchResults', { query: store.searchQuery })
        "
        :page="store.pagination.page"
        :total-pages="store.pagination.totalPages"
        :total="store.pagination.total"
        :limit="store.pagination.limit"
        :show-details-panel="showDetailsPanel && !!store.selectedItem"
        @close-filter="showFilterPanel = false"
        @reset-filters="store.resetFilters()"
        @sort="onSort"
        @update:width="setColumnWidth"
        @update:page="store.changePage"
        @update:limit="store.changeLimit"
        @select-item="(item) => store.selectItem(item as TransportOrderApi)"
        @row-dblclick="(item) => openFromList((item as TransportOrderApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item, value }">
          <span class="inline-flex items-center gap-1.5 min-w-0">
            <span class="truncate">{{ optionLabel('transportOrderStatus')(value, item) }}</span>
            <span
              v-if="(item as TransportOrderApi).awaitingConfirmations"
              class="inline-flex items-center gap-0.5 text-warning shrink-0"
              :title="
                t(
                  'planning.transportOrders.awaitingConfirmations',
                  (item as TransportOrderApi).awaitingConfirmations
                )
              "
            >
              <PhoneCall class="w-3.5 h-3.5" />
              <span class="text-xs tabular-nums">{{
                (item as TransportOrderApi).awaitingConfirmations
              }}</span>
            </span>
          </span>
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            @update:model-value="onUpdateUserFilters"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('planning.transportOrders.col.recipientSummary') }}
                  </p>
                  <p class="font-semibold text-primary">
                    {{ store.selectedItem.recipientSummary || '—' }}
                  </p>
                </div>
                <dl class="grid grid-cols-2 gap-x-3 gap-y-2">
                  <template v-for="column in detailColumns" :key="column.sortKey">
                    <dt class="text-xs text-muted-foreground">{{ column.label }}</dt>
                    <dd class="text-right font-medium text-card-foreground">
                      {{ detailValue(store.selectedItem, column) }}
                    </dd>
                  </template>
                </dl>
              </div>
            </template>
            <template #footer>
              <button
                v-if="canViewSelected"
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium"
                @click="openSelectedView"
              >
                {{ t('common.view') }}
              </button>
              <button
                v-if="canEditSelected"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                @click="openSelectedEdit"
              >
                {{ t('common.edit') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <TransportOrderCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :transport-order-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <TransportOrderCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
    <CreateTransportOrderDialog
      :open="creatingFromRequests"
      @close="creatingFromRequests = false"
      @created="onCreatedFromRequests"
    />
  </div>
</template>
