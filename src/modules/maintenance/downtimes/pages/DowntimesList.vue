<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { downtimeApi } from '../api/downtimeApi'
import { useDowntimeStore, type DowntimeListView } from '../stores/downtimeStore'
import type { DowntimeApi, DowntimeSearchColumn } from '../types/downtime.types'

const { t } = useI18n()
const store = useDowntimeStore()
const { formatDateTime, formatDecimal, formatInteger, optionLabel } = useListCellFormatters()

const listViewOptions = computed<{ value: DowntimeListView; label: string }[]>(() => [
  { value: 'open', label: t('maintenance.downtimes.listView.open') },
  { value: 'closed', label: t('maintenance.downtimes.listView.closed') },
  { value: 'all', label: t('maintenance.downtimes.listView.all') }
])

const searchColumnOptions = computed<{ value: DowntimeSearchColumn; label: string }[]>(() => [
  { value: 'no,vehiclePlate,downtimeCodeName', label: t('maintenance.downtimes.search.all') },
  { value: 'no', label: t('maintenance.downtimes.col.no') },
  { value: 'vehiclePlate', label: t('maintenance.downtimes.col.vehiclePlate') },
  { value: 'downtimeCodeName', label: t('maintenance.downtimes.col.downtimeCodeName') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('maintenance.downtimes.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'startedAt',
    label: t('maintenance.downtimes.col.startedAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  { sortKey: 'vehiclePlate', label: t('maintenance.downtimes.col.vehiclePlate'), minW: '120px' },
  {
    sortKey: 'downtimeCodeName',
    label: t('maintenance.downtimes.col.downtimeCodeName'),
    minW: '200px'
  },
  {
    sortKey: 'family',
    label: t('maintenance.downtimes.col.family'),
    minW: '130px',
    formatter: optionLabel('downtimeFamily')
  },
  {
    sortKey: 'endedAt',
    label: t('maintenance.downtimes.col.endedAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  {
    sortKey: 'durationDays',
    label: t('maintenance.downtimes.col.durationDays'),
    minW: '120px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'cost',
    label: t('maintenance.downtimes.col.cost'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'status',
    label: t('maintenance.downtimes.col.status'),
    minW: '110px',
    formatter: optionLabel('downtimeStatus')
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
    labelKey: 'maintenance.downtimes.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'downtimeStatus'
  },
  {
    field: 'family',
    labelKey: 'maintenance.downtimes.col.family',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'downtimeFamily'
  }
]

const detailKeys = ['vehiclePlate', 'downtimeCodeName', 'durationDays', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: DowntimeApi, column: TableColumn): string {
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
} = useListPage<DowntimeApi, DowntimeSearchColumn>({
  tableId: 'maintenance-downtimes',
  feature: 'DOWNTIME',
  filterDefs,
  store,
  columns: tableColumns,
  exportFileBaseName: 'downtimes',
  exportApi: downtimeApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.downtimes.title')"
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
        @update:list-view="store.setListView($event as DowntimeListView)"
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
        :loading-text="t('maintenance.downtimes.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('maintenance.downtimes.noResults')"
        :no-search-results-message="
          t('maintenance.downtimes.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as DowntimeApi)"
        @row-dblclick="(item) => openFromList((item as DowntimeApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as DowntimeListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('maintenance.downtimes.col.vehiclePlate') }}
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

    <DowntimeCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :downtime-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <DowntimeCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
