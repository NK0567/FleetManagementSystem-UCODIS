<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { formatNumber } from '@/utils/format'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { stockItemApi } from '../api/stockItemApi'
import { stockItemService } from '../services/stockItemService'
import { useStockItemStore, type StockItemListView } from '../stores/stockItemStore'
import type { StockItemApi, StockItemSearchColumn, StockSummaryApi } from '../types/stockItem.types'

const { t } = useI18n()
const store = useStockItemStore()
const { formatDateTime, referenceLabel, formatInteger, booleanLabel, optionLabel } =
  useListCellFormatters()

const summary = ref<StockSummaryApi | null>(null)

async function loadSummary() {
  summary.value = await stockItemService.summary().catch(() => null)
}

onMounted(loadSummary)
watch(() => store.items, loadSummary)

const summaryText = computed(() =>
  summary.value
    ? t('maintenance.stockItems.summary', {
        value: formatNumber(summary.value.totalValue),
        items: summary.value.itemCount,
        toReorder: summary.value.toReorderCount
      })
    : ''
)

const listViewOptions = computed<{ value: StockItemListView; label: string }[]>(() => [
  { value: 'toReorder', label: t('maintenance.stockItems.listView.toReorder') },
  { value: 'all', label: t('maintenance.stockItems.listView.all') }
])

const searchColumnOptions = computed<{ value: StockItemSearchColumn; label: string }[]>(() => [
  { value: 'no,name', label: t('maintenance.stockItems.search.all') },
  { value: 'no', label: t('maintenance.stockItems.col.no') },
  { value: 'name', label: t('maintenance.stockItems.col.name') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('maintenance.stockItems.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'name', label: t('maintenance.stockItems.col.name'), minW: '260px' },
  {
    sortKey: 'subsystemNo',
    label: t('maintenance.stockItems.col.subsystemNo'),
    minW: '170px',
    formatter: referenceLabel('failureSubsystems')
  },
  {
    sortKey: 'supplierNo',
    label: t('maintenance.stockItems.col.supplierNo'),
    minW: '200px',
    formatter: referenceLabel('partsSuppliers')
  },
  {
    sortKey: 'unitPrice',
    label: t('maintenance.stockItems.col.unitPrice'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'alertThreshold',
    label: t('maintenance.stockItems.col.alertThreshold'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'active',
    label: t('maintenance.stockItems.col.active'),
    minW: '90px',
    defaultHidden: true,
    formatter: booleanLabel
  },
  {
    sortKey: 'stockQuantity',
    label: t('maintenance.stockItems.col.stockQuantity'),
    minW: '100px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'stockValue',
    label: t('maintenance.stockItems.col.stockValue'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'status',
    label: t('maintenance.stockItems.col.status'),
    minW: '120px',
    formatter: optionLabel('stockStatus')
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
    labelKey: 'maintenance.stockItems.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'stockStatus'
  },
  {
    field: 'subsystemNo',
    labelKey: 'maintenance.stockItems.col.subsystemNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'failureSubsystems'
  },
  {
    field: 'supplierNo',
    labelKey: 'maintenance.stockItems.col.supplierNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'partsSuppliers'
  }
]

const detailKeys = ['name', 'stockQuantity', 'alertThreshold', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: StockItemApi, column: TableColumn): string {
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
} = useListPage<StockItemApi, StockItemSearchColumn>({
  tableId: 'maintenance-stock-items',
  feature: 'STOCKITEM',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'stock-items',
  exportApi: stockItemApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.stockItems.title')"
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
        :list-view-options="listViewOptions"
        :list-view="store.listView"
        @update:list-view="store.setListView($event as StockItemListView)"
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
      </ListPageToolbar>

      <p v-if="summaryText" class="mx-4 mt-2 text-xs text-muted-foreground">{{ summaryText }}</p>
      <FormAlerts class="mx-4" :error="exportError" @clear:error="exportError = null" />

      <ListPageLayout
        :filter-panel-open="showFilterPanel"
        :table-columns="visibleColumns"
        :sticky-column-count="stickyColumnCount"
        :resizable="true"
        :reorderable="true"
        :on-reorder-columns="onReorderColumns"
        :sort-by="store.sortBy"
        :sort-direction="store.sortDirection"
        :loading="store.loading"
        :loading-text="t('maintenance.stockItems.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('maintenance.stockItems.noResults')"
        :no-search-results-message="
          t('maintenance.stockItems.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as StockItemApi)"
        @row-dblclick="(item) => openFromList((item as StockItemApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as StockItemListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('maintenance.stockItems.col.name') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.name }}</p>
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

    <StockItemCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :stock-item-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <StockItemCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
