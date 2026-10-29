<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { roadChecklistApi } from '../api/roadChecklistApi'
import { useRoadChecklistStore } from '../stores/roadChecklistStore'
import type { RoadChecklistApi, RoadChecklistSearchColumn } from '../types/roadChecklist.types'

const { t } = useI18n()
const store = useRoadChecklistStore()
const { formatDateTime, referenceLabel, optionLabel, formatInteger, booleanLabel } =
  useListCellFormatters()

const searchColumnOptions = computed<{ value: RoadChecklistSearchColumn; label: string }[]>(() => [
  { value: 'no,tripNo,vehiclePlate', label: t('fleet.roadChecklists.search.all') },
  { value: 'no', label: t('fleet.roadChecklists.col.no') },
  { value: 'tripNo', label: t('fleet.roadChecklists.col.tripNo') },
  { value: 'vehiclePlate', label: t('fleet.roadChecklists.col.vehiclePlate') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.roadChecklists.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'tripNo',
    label: t('fleet.roadChecklists.col.tripNo'),
    minW: '120px',
    formatter: referenceLabel('openTrips')
  },
  {
    sortKey: 'stage',
    label: t('fleet.roadChecklists.col.stage'),
    minW: '110px',
    formatter: optionLabel('checklistStage')
  },
  {
    sortKey: 'takenAt',
    label: t('fleet.roadChecklists.col.takenAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  { sortKey: 'vehiclePlate', label: t('fleet.roadChecklists.col.vehiclePlate'), minW: '120px' },
  {
    sortKey: 'anomalyCount',
    label: t('fleet.roadChecklists.col.anomalyCount'),
    minW: '100px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'blocking',
    label: t('fleet.roadChecklists.col.blocking'),
    minW: '100px',
    formatter: booleanLabel
  },
  {
    sortKey: 'signed',
    label: t('fleet.roadChecklists.col.signed'),
    minW: '100px',
    formatter: booleanLabel
  },
  {
    sortKey: 'syncedAt',
    label: t('fleet.roadChecklists.col.syncedAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  {
    sortKey: 'capturedOffline',
    label: t('fleet.roadChecklists.col.capturedOffline'),
    minW: '120px',
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
    field: 'tripNo',
    labelKey: 'fleet.roadChecklists.col.tripNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'openTrips'
  },
  {
    field: 'stage',
    labelKey: 'fleet.roadChecklists.col.stage',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'checklistStage'
  },
  {
    field: 'signed',
    labelKey: 'fleet.roadChecklists.col.signed',
    valueType: 'boolean',
    kind: 'boolean'
  },
  {
    field: 'capturedOffline',
    labelKey: 'fleet.roadChecklists.col.capturedOffline',
    valueType: 'boolean',
    kind: 'boolean'
  }
]

const detailKeys = ['tripNo', 'vehiclePlate', 'anomalyCount', 'blocking', 'signed', 'syncedAt']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: RoadChecklistApi, column: TableColumn): string {
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
} = useListPage<RoadChecklistApi, RoadChecklistSearchColumn>({
  tableId: 'fleet-road-checklists',
  feature: 'ROADCHECKLIST',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'road-checklists',
  exportApi: roadChecklistApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.roadChecklists.title')"
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
        :loading-text="t('fleet.roadChecklists.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.roadChecklists.noResults')"
        :no-search-results-message="
          t('fleet.roadChecklists.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as RoadChecklistApi)"
        @row-dblclick="(item) => openFromList((item as RoadChecklistApi).no)"
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
                    {{ t('fleet.roadChecklists.col.tripNo') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.tripNo }}</p>
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

    <RoadChecklistCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :road-checklist-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <RoadChecklistCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
