<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Upload } from '@lucide/vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { vehicleApi } from '../api/vehicleApi'
import { useVehicleStore, type VehicleListView } from '../stores/vehicleStore'
import type { VehicleApi, VehicleSearchColumn } from '../types/vehicle.types'
import VehicleImportDialog from '../components/VehicleImportDialog.vue'

const { t } = useI18n()
const store = useVehicleStore()
const { booleanLabel, formatDateTime, formatInteger, formatDate, optionLabel, formatDecimal } =
  useListCellFormatters()

const listViewOptions = computed<{ value: VehicleListView; label: string }[]>(() => [
  { value: 'fleet', label: t('fleet.vehicles.listView.fleet') },
  { value: 'removed', label: t('fleet.vehicles.listView.removed') },
  { value: 'all', label: t('fleet.vehicles.listView.all') }
])

const searchColumnOptions = computed<{ value: VehicleSearchColumn; label: string }[]>(() => [
  { value: 'no,plate,vin,formerPlates', label: t('fleet.vehicles.search.all') },
  { value: 'no', label: t('fleet.vehicles.col.no') },
  { value: 'plate', label: t('fleet.vehicles.col.plate') },
  { value: 'vin', label: t('fleet.vehicles.col.vin') },
  { value: 'formerPlates', label: t('fleet.vehicles.col.formerPlates') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.vehicles.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'plate', label: t('fleet.vehicles.col.plate'), minW: '130px' },
  { sortKey: 'vin', label: t('fleet.vehicles.col.vin'), minW: '170px', defaultHidden: true },
  { sortKey: 'vehicleTypeName', label: t('fleet.vehicles.col.vehicleTypeNo'), minW: '140px' },
  { sortKey: 'make', label: t('fleet.vehicles.col.make'), minW: '120px' },
  { sortKey: 'model', label: t('fleet.vehicles.col.model'), minW: '160px' },
  {
    sortKey: 'category',
    label: t('fleet.vehicles.col.category'),
    minW: '150px',
    defaultHidden: true
  },
  { sortKey: 'driverName', label: t('fleet.vehicles.col.driverName'), minW: '180px' },
  {
    sortKey: 'coupledVehiclePlate',
    label: t('fleet.vehicles.col.coupledVehiclePlate'),
    minW: '130px'
  },
  { sortKey: 'homeSiteName', label: t('fleet.vehicles.col.homeSiteNo'), minW: '170px' },
  {
    sortKey: 'year',
    label: t('fleet.vehicles.col.year'),
    minW: '90px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'firstRegistrationDate',
    label: t('fleet.vehicles.col.firstRegistrationDate'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDate
  },
  {
    sortKey: 'fuelType',
    label: t('fleet.vehicles.col.fuelType'),
    minW: '110px',
    defaultHidden: true,
    formatter: optionLabel('fuelType')
  },
  {
    sortKey: 'tankCapacityL',
    label: t('fleet.vehicles.col.tankCapacityL'),
    minW: '130px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'maxLoadKg',
    label: t('fleet.vehicles.col.maxLoadKg'),
    minW: '130px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'maxVolumeM3',
    label: t('fleet.vehicles.col.maxVolumeM3'),
    minW: '120px',
    align: 'right',
    defaultHidden: true,
    formatter: formatDecimal
  },
  {
    sortKey: 'acquisitionMode',
    label: t('fleet.vehicles.col.acquisitionMode'),
    minW: '130px',
    defaultHidden: true,
    formatter: optionLabel('acquisitionMode')
  },
  {
    sortKey: 'odometerKm',
    label: t('fleet.vehicles.col.odometerKm'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'status',
    label: t('fleet.vehicles.col.status'),
    minW: '130px',
    formatter: optionLabel('vehicleStatus')
  },
  { sortKey: 'statusReason', label: t('fleet.vehicles.col.statusReason'), minW: '220px' },
  {
    sortKey: 'statusCauseCode',
    label: t('fleet.vehicles.col.statusCauseCode'),
    minW: '200px',
    formatter: (value, row) =>
      value ? `${String(value)} · ${(row as VehicleApi).statusCauseCodeName}` : ''
  },
  {
    sortKey: 'administrativeStatus',
    label: t('fleet.vehicles.col.administrativeStatus'),
    minW: '140px',
    defaultHidden: true,
    formatter: optionLabel('administrativeStatus')
  },
  {
    sortKey: 'formerPlates',
    label: t('fleet.vehicles.col.formerPlates'),
    minW: '160px',
    defaultHidden: true
  },
  {
    sortKey: 'hasTracker',
    label: t('fleet.vehicles.col.hasTracker'),
    minW: '110px',
    defaultHidden: true,
    formatter: booleanLabel
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

const importing = ref(false)

const filterDefs: FilterFieldDef[] = [
  {
    field: 'status',
    labelKey: 'fleet.vehicles.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'vehicleStatus'
  },
  {
    field: 'statusCauseCode',
    labelKey: 'fleet.vehicles.col.statusCauseCode',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'downtimeCodes'
  },
  {
    field: 'vehicleTypeNo',
    labelKey: 'fleet.vehicles.col.vehicleTypeNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'vehicleTypes'
  },
  {
    field: 'homeSiteNo',
    labelKey: 'fleet.vehicles.col.homeSiteNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'sites'
  },
  {
    field: 'fuelType',
    labelKey: 'fleet.vehicles.col.fuelType',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'fuelType'
  },
  {
    field: 'acquisitionMode',
    labelKey: 'fleet.vehicles.col.acquisitionMode',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'acquisitionMode'
  }
]

const detailKeys = ['vehicleTypeName', 'make', 'model', 'homeSiteName', 'odometerKm']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: VehicleApi, column: TableColumn): string {
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
} = useListPage<VehicleApi, VehicleSearchColumn>({
  tableId: 'fleet-vehicles',
  feature: 'VEHICLE',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'vehicles',
  exportApi: vehicleApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.vehicles.title')"
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
        @update:list-view="store.setListView($event as VehicleListView)"
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
        <template v-if="canInsert" #extra-actions>
          <button
            type="button"
            class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
            @click="importing = true"
          >
            <Upload class="w-4 h-4 text-primary" />
            {{ t('fleet.vehicles.import.action') }}
          </button>
        </template>
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
        :loading-text="t('fleet.vehicles.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.vehicles.noResults')"
        :no-search-results-message="
          t('fleet.vehicles.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as VehicleApi)"
        @row-dblclick="(item) => openFromList((item as VehicleApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <VehicleStatusPill :status="(item as VehicleApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as VehicleListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.vehicles.col.plate') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.plate }}</p>
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

    <VehicleImportDialog
      :open="importing"
      @close="importing = false"
      @imported="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
    <VehicleCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :vehicle-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <VehicleCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
