<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { stockMovementApi } from '../api/stockItemApi'
import { useStockMovementStore } from '../stores/stockMovementStore'
import type { StockMovementApi, StockMovementSearchColumn } from '../types/stockItem.types'

const { t } = useI18n()
const router = useRouter()
const store = useStockMovementStore()
const { formatDateTime, formatInteger, optionLabel } = useListCellFormatters()

const searchColumnOptions = computed<{ value: StockMovementSearchColumn; label: string }[]>(() => [
  {
    value: 'itemNo,itemName,workOrderNo,reason',
    label: t('maintenance.stockMovements.search.all')
  },
  { value: 'itemNo', label: t('maintenance.stockMovements.col.itemNo') },
  { value: 'itemName', label: t('maintenance.stockMovements.col.itemName') },
  { value: 'workOrderNo', label: t('maintenance.stockMovements.col.workOrderNo') },
  { value: 'reason', label: t('maintenance.stockMovements.col.reason') }
])

const tableColumns = computed<TableColumn[]>(() => [
  {
    sortKey: 'at',
    label: t('maintenance.stockMovements.col.at'),
    minW: '150px',
    formatter: formatDateTime
  },
  { sortKey: 'itemNo', label: t('maintenance.stockMovements.col.itemNo'), minW: '120px' },
  { sortKey: 'itemName', label: t('maintenance.stockMovements.col.itemName'), minW: '240px' },
  {
    sortKey: 'kind',
    label: t('maintenance.stockMovements.col.kind'),
    minW: '110px',
    formatter: optionLabel('stockMovementKind')
  },
  {
    sortKey: 'delta',
    label: t('maintenance.stockMovements.col.delta'),
    minW: '90px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'unitPrice',
    label: t('maintenance.stockMovements.col.unitPrice'),
    minW: '110px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'value',
    label: t('maintenance.stockMovements.col.value'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'workOrderNo',
    label: t('maintenance.stockMovements.col.workOrderNo'),
    minW: '130px'
  },
  {
    sortKey: 'vehiclePlate',
    label: t('maintenance.stockMovements.col.vehiclePlate'),
    minW: '110px'
  },
  {
    sortKey: 'purchaseRequestNo',
    label: t('maintenance.stockMovements.col.purchaseRequestNo'),
    minW: '130px'
  },
  { sortKey: 'reason', label: t('maintenance.stockMovements.col.reason'), minW: '240px' },
  {
    sortKey: 'recordedBy',
    label: t('maintenance.stockMovements.col.recordedBy'),
    minW: '110px',
    defaultHidden: true
  }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'kind',
    labelKey: 'maintenance.stockMovements.col.kind',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'stockMovementKind'
  },
  {
    field: 'itemNo',
    labelKey: 'maintenance.stockMovements.col.itemNo',
    valueType: 'string',
    kind: 'text'
  }
]

const {
  showFilterPanel,
  appliedFilterCount,
  showDetailsPanel,
  hideListContent,
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
  onSort,
  onSearchColumnChange,
  onUpdateUserFilters,
  onReorderColumns
} = useListPage<StockMovementApi, StockMovementSearchColumn>({
  tableId: 'maintenance-stock-movements',
  feature: 'STOCKITEM',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'stock-movements',
  exportApi: stockMovementApi.exportExcel,
  hasCard: false
})

const openItem = (movement: StockMovementApi) =>
  router.push({
    path: '/maintenance/stock-items',
    query: { no: movement.itemNo, cardMode: 'view' }
  })
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.stockMovements.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-create="false"
        :show-list-view="false"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @toggle-filter="showFilterPanel = !showFilterPanel"
        @toggle-details="showDetailsPanel = !showDetailsPanel"
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
        :loading-text="t('maintenance.stockMovements.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('maintenance.stockMovements.noResults')"
        :no-search-results-message="
          t('maintenance.stockMovements.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as StockMovementApi)"
        @row-dblclick="(item) => openItem(item as StockMovementApi)"
      >
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
              <div class="px-4 py-4 space-y-2 flex-1 overflow-y-auto text-sm">
                <p class="font-semibold text-primary">{{ store.selectedItem.itemName }}</p>
                <p class="text-muted-foreground">{{ store.selectedItem.reason }}</p>
              </div>
            </template>
            <template #footer>
              <button
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium"
                @click="openItem(store.selectedItem)"
              >
                {{ t('maintenance.stockMovements.openItem') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>
  </div>
</template>
