<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { vehicleCheckPointApi } from '../api/vehicleCheckPointApi'
import { vehicleCheckPointService } from '../services/vehicleCheckPointService'
import { useVehicleCheckPointStore } from '../stores/vehicleCheckPointStore'
import type {
  VehicleCheckPointApi,
  VehicleCheckPointSearchColumn
} from '../types/vehicleCheckPoint.types'

const { t } = useI18n()
const store = useVehicleCheckPointStore()
const { formatDateTime, optionLabel, booleanLabel, formatInteger } = useListCellFormatters()

const searchColumnOptions = computed<{ value: VehicleCheckPointSearchColumn; label: string }[]>(
  () => [
    { value: 'no,label', label: t('maintenance.vehicleCheckPoints.search.all') },
    { value: 'no', label: t('maintenance.vehicleCheckPoints.col.no') },
    { value: 'label', label: t('maintenance.vehicleCheckPoints.col.label') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('maintenance.vehicleCheckPoints.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'moment',
    label: t('maintenance.vehicleCheckPoints.col.moment'),
    minW: '180px',
    formatter: optionLabel('vehicleCheckMoment')
  },
  { sortKey: 'label', label: t('maintenance.vehicleCheckPoints.col.label'), minW: '260px' },
  {
    sortKey: 'blocking',
    label: t('maintenance.vehicleCheckPoints.col.blocking'),
    minW: '100px',
    formatter: booleanLabel
  },
  {
    sortKey: 'sortOrder',
    label: t('maintenance.vehicleCheckPoints.col.sortOrder'),
    minW: '80px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'active',
    label: t('maintenance.vehicleCheckPoints.col.active'),
    minW: '90px',
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

const filterDefs: FilterFieldDef[] = [
  {
    field: 'moment',
    labelKey: 'maintenance.vehicleCheckPoints.col.moment',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'vehicleCheckMoment'
  }
]

const detailKeys = ['moment', 'blocking', 'sortOrder']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: VehicleCheckPointApi, column: TableColumn): string {
  return getListCellDisplay(
    (item as unknown as Record<string, unknown>)[column.sortKey],
    item,
    column
  )
}

const {
  canInsert,
  canDelete,
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
  itemToDelete,
  deleting,
  deleteError,
  askDelete,
  confirmDelete,
  onSort,
  onSearchColumnChange,
  onUpdateUserFilters,
  onReorderColumns
} = useListPage<VehicleCheckPointApi, VehicleCheckPointSearchColumn>({
  tableId: 'maintenance-vehicle-check-points',
  feature: 'VEHICLECHECKPOINT',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'vehicle-check-points',
  exportApi: vehicleCheckPointApi.exportExcel,
  remove: vehicleCheckPointService.remove,
  deleteErrorFallback: t('maintenance.vehicleCheckPoints.deleteError')
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.vehicleCheckPoints.title')"
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
      </ListPageToolbar>

      <FormAlerts
        class="mx-4"
        :error="deleteError ?? exportError"
        @clear:error="deleteError = exportError = null"
      />

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
        :loading-text="t('maintenance.vehicleCheckPoints.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert
            ? t('maintenance.vehicleCheckPoints.noResultsCreate')
            : t('maintenance.vehicleCheckPoints.noResults')
        "
        :no-search-results-message="
          t('maintenance.vehicleCheckPoints.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as VehicleCheckPointApi)"
        @row-dblclick="(item) => openFromList((item as VehicleCheckPointApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
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
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('maintenance.vehicleCheckPoints.col.label') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.label }}</p>
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
              <button
                v-if="canDelete"
                type="button"
                class="px-3 py-2 border border-destructive text-destructive text-sm rounded hover:bg-destructive/10 transition font-medium"
                @click="askDelete(store.selectedItem)"
              >
                {{ t('common.delete') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <ConfirmDialog
      :open="!!itemToDelete"
      :title="t('maintenance.vehicleCheckPoints.confirmDelete')"
      :message="t('maintenance.vehicleCheckPoints.confirmDeleteMsg', { name: itemToDelete?.label })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <VehicleCheckPointCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :vehicle-check-point-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <VehicleCheckPointCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
