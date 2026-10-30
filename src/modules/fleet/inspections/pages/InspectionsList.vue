<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { inspectionApi } from '../api/inspectionApi'
import { useInspectionStore } from '../stores/inspectionStore'
import type { InspectionApi, InspectionSearchColumn } from '../types/inspection.types'

const { t } = useI18n()
const store = useInspectionStore()
const { formatDateTime, formatDate, optionLabel } = useListCellFormatters()

const searchColumnOptions = computed<{ value: InspectionSearchColumn; label: string }[]>(() => [
  { value: 'no,vehiclePlate,center', label: t('fleet.inspections.search.all') },
  { value: 'no', label: t('fleet.inspections.col.no') },
  { value: 'vehiclePlate', label: t('fleet.inspections.col.vehiclePlate') },
  { value: 'center', label: t('fleet.inspections.col.center') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.inspections.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'inspectedOn',
    label: t('fleet.inspections.col.inspectedOn'),
    minW: '110px',
    formatter: formatDate
  },
  { sortKey: 'center', label: t('fleet.inspections.col.center'), minW: '200px' },
  {
    sortKey: 'result',
    label: t('fleet.inspections.col.result'),
    minW: '130px',
    formatter: optionLabel('inspectionResult')
  },
  { sortKey: 'vehiclePlate', label: t('fleet.inspections.col.vehiclePlate'), minW: '120px' },
  {
    sortKey: 'recheckDueOn',
    label: t('fleet.inspections.col.recheckDueOn'),
    minW: '140px',
    formatter: formatDate
  },
  {
    sortKey: 'recheckDoneOn',
    label: t('fleet.inspections.col.recheckDoneOn'),
    minW: '140px',
    defaultHidden: true,
    formatter: formatDate
  },
  {
    sortKey: 'state',
    label: t('fleet.inspections.col.state'),
    minW: '140px',
    formatter: optionLabel('inspectionState')
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
    field: 'state',
    labelKey: 'fleet.inspections.col.state',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'inspectionState'
  },
  {
    field: 'result',
    labelKey: 'fleet.inspections.col.result',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'inspectionResult'
  }
]

const detailKeys = ['vehiclePlate', 'inspectedOn', 'recheckDueOn', 'state']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: InspectionApi, column: TableColumn): string {
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
} = useListPage<InspectionApi, InspectionSearchColumn>({
  tableId: 'fleet-inspections',
  feature: 'INSPECTION',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'inspections',
  exportApi: inspectionApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.inspections.title')"
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
        :loading-text="t('fleet.inspections.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('fleet.inspections.noResultsCreate') : t('fleet.inspections.noResults')
        "
        :no-search-results-message="
          t('fleet.inspections.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as InspectionApi)"
        @row-dblclick="(item) => openFromList((item as InspectionApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-state="{ item }">
          <InspectionStatePill :state="(item as InspectionApi).state" />
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
                    {{ t('fleet.inspections.col.vehiclePlate') }}
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

    <InspectionCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :inspection-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <InspectionCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
