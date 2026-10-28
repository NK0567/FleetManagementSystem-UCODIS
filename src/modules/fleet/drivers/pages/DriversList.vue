<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { driverApi } from '../api/driverApi'
import { useDriverStore } from '../stores/driverStore'
import type { DriverApi, DriverSearchColumn } from '../types/driver.types'

const { t } = useI18n()
const store = useDriverStore()
const { booleanLabel, formatDate, formatDateTime, optionLabel } = useListCellFormatters()

const searchColumnOptions = computed<{ value: DriverSearchColumn; label: string }[]>(() => [
  { value: 'no,fullName,phone,vehiclePlate', label: t('fleet.drivers.search.all') },
  { value: 'no', label: t('fleet.drivers.col.no') },
  { value: 'fullName', label: t('fleet.drivers.col.fullName') },
  { value: 'phone', label: t('fleet.drivers.col.phone') },
  { value: 'vehiclePlate', label: t('fleet.drivers.col.vehiclePlate') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.drivers.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'fullName', label: t('fleet.drivers.col.fullName'), minW: '200px' },
  { sortKey: 'jobPositionName', label: t('fleet.drivers.col.jobPositionName'), minW: '150px' },
  { sortKey: 'phone', label: t('fleet.drivers.col.phone'), minW: '140px' },
  { sortKey: 'vehiclePlate', label: t('fleet.drivers.col.vehiclePlate'), minW: '130px' },
  {
    sortKey: 'assignedSince',
    label: t('fleet.drivers.col.assignedSince'),
    minW: '130px',
    defaultHidden: true,
    formatter: formatDate
  },
  {
    sortKey: 'availability',
    label: t('fleet.drivers.col.availability'),
    minW: '130px',
    formatter: optionLabel('driverAvailability')
  },
  { sortKey: 'score', label: t('fleet.drivers.col.score'), minW: '90px', align: 'right' },
  {
    sortKey: 'scoreDelta',
    label: t('fleet.drivers.col.scoreDelta'),
    minW: '110px',
    align: 'right',
    defaultHidden: true
  },
  {
    sortKey: 'eligible',
    label: t('fleet.drivers.col.eligible'),
    minW: '110px',
    formatter: booleanLabel
  },
  {
    sortKey: 'ineligibilityReasons',
    label: t('fleet.drivers.col.ineligibilityReasons'),
    minW: '260px'
  },
  {
    sortKey: 'drivingAuthorized',
    label: t('fleet.drivers.col.drivingAuthorized'),
    minW: '110px',
    defaultHidden: true,
    formatter: booleanLabel
  },
  {
    sortKey: 'employeeStatus',
    label: t('fleet.drivers.col.employeeStatus'),
    minW: '130px',
    defaultHidden: true,
    formatter: optionLabel('employeeStatus')
  },
  {
    sortKey: 'siteName',
    label: t('fleet.drivers.col.siteName'),
    minW: '170px',
    defaultHidden: true
  },
  {
    sortKey: 'modifiedAt',
    label: t('common.audit.modifiedAt'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
  }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'availability',
    labelKey: 'fleet.drivers.col.availability',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'driverAvailability'
  },
  {
    field: 'employeeStatus',
    labelKey: 'fleet.drivers.col.employeeStatus',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'employeeStatus'
  },
  {
    field: 'jobPositionNo',
    labelKey: 'fleet.drivers.col.jobPositionName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'jobPositions'
  }
]

const detailKeys = ['jobPositionName', 'phone', 'vehiclePlate', 'availability', 'eligible']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: DriverApi, column: TableColumn): string {
  return getListCellDisplay(
    (item as unknown as Record<string, unknown>)[column.sortKey],
    item,
    column
  )
}

const {
  showFilterPanel,
  appliedFilterCount,
  showDetailsPanel,
  hideListContent,
  showCardActions,
  canViewSelected,
  openSelectedView,
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
  onSort,
  onSearchColumnChange,
  onUpdateUserFilters,
  onReorderColumns
} = useListPage<DriverApi, DriverSearchColumn>({
  tableId: 'fleet-drivers',
  feature: 'DRIVER',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'drivers',
  exportApi: driverApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.drivers.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-create="false"
        :show-card-actions="showCardActions"
        :can-view-selected="canViewSelected"
        :can-edit-selected="false"
        :show-list-view="false"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @toggle-filter="showFilterPanel = !showFilterPanel"
        @toggle-details="showDetailsPanel = !showDetailsPanel"
        @view="openSelectedView"
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
        :loading-text="t('fleet.drivers.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.drivers.noResults')"
        :no-search-results-message="
          t('fleet.drivers.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as DriverApi)"
        @row-dblclick="(item) => openFromList((item as DriverApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-availability="{ item }">
          <DriverAvailabilityPill :availability="(item as DriverApi).availability" />
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
                    {{ t('fleet.drivers.col.fullName') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.fullName }}</p>
                  <p
                    v-if="store.selectedItem.ineligibilityReasons"
                    class="text-destructive text-xs mt-1"
                  >
                    {{ store.selectedItem.ineligibilityReasons }}
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
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <DriverCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :driver-no="cardNo"
      @close="closeCard"
    />
  </div>
</template>
