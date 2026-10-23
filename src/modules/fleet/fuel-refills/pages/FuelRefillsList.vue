<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { fuelRefillApi } from '../api/fuelRefillApi'
import { useFuelRefillStore, type FuelRefillListView } from '../stores/fuelRefillStore'
import type { FuelRefillApi, FuelRefillSearchColumn } from '../types/fuelRefill.types'

const { t } = useI18n()
const store = useFuelRefillStore()
const { formatDateTime, formatDecimal, formatInteger, booleanLabel, optionLabel } =
  useListCellFormatters()

const listViewOptions = computed<{ value: FuelRefillListView; label: string }[]>(() => [
  { value: 'all', label: t('fleet.fuelRefills.listView.all') },
  { value: 'anomaly', label: t('fleet.fuelRefills.listView.anomaly') }
])

const searchColumnOptions = computed<{ value: FuelRefillSearchColumn; label: string }[]>(() => [
  { value: 'no,vehiclePlate,driverName,stationLabel', label: t('fleet.fuelRefills.search.all') },
  { value: 'no', label: t('fleet.fuelRefills.col.no') },
  { value: 'vehiclePlate', label: t('fleet.fuelRefills.col.vehiclePlate') },
  { value: 'driverName', label: t('fleet.fuelRefills.col.driverName') },
  { value: 'stationLabel', label: t('fleet.fuelRefills.col.stationLabel') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.fuelRefills.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'refueledAt',
    label: t('fleet.fuelRefills.col.refueledAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  {
    sortKey: 'liters',
    label: t('fleet.fuelRefills.col.liters'),
    minW: '90px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'unitPrice',
    label: t('fleet.fuelRefills.col.unitPrice'),
    minW: '110px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'odometerKm',
    label: t('fleet.fuelRefills.col.odometerKm'),
    minW: '110px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'fullTank',
    label: t('fleet.fuelRefills.col.fullTank'),
    minW: '100px',
    formatter: booleanLabel
  },
  { sortKey: 'vehiclePlate', label: t('fleet.fuelRefills.col.vehiclePlate'), minW: '120px' },
  { sortKey: 'driverName', label: t('fleet.fuelRefills.col.driverName'), minW: '170px' },
  { sortKey: 'stationLabel', label: t('fleet.fuelRefills.col.stationLabel'), minW: '180px' },
  {
    sortKey: 'amount',
    label: t('fleet.fuelRefills.col.amount'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'status',
    label: t('fleet.fuelRefills.col.status'),
    minW: '110px',
    formatter: optionLabel('refillStatus')
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
    labelKey: 'fleet.fuelRefills.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'refillStatus'
  },
  {
    field: 'vehicleNo',
    labelKey: 'fleet.fuelRefills.col.vehiclePlate',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'motorizedVehicles'
  }
]

const detailKeys = ['vehiclePlate', 'driverName', 'liters', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: FuelRefillApi, column: TableColumn): string {
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
} = useListPage<FuelRefillApi, FuelRefillSearchColumn>({
  tableId: 'fleet-fuel-refills',
  feature: 'FUELREFILL',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'fuel-refills',
  exportApi: fuelRefillApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.fuelRefills.title')"
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
        @update:list-view="store.setListView($event as FuelRefillListView)"
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
        :loading-text="t('fleet.fuelRefills.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.fuelRefills.noResults')"
        :no-search-results-message="
          t('fleet.fuelRefills.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as FuelRefillApi)"
        @row-dblclick="(item) => openFromList((item as FuelRefillApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <RefillStatusPill :status="(item as FuelRefillApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as FuelRefillListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.fuelRefills.col.vehiclePlate') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.vehiclePlate }}</p>
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

    <FuelRefillCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :fuel-refill-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <FuelRefillCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
