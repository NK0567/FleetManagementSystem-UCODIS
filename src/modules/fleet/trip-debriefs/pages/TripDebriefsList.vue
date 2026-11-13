<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { tripDebriefApi } from '../api/tripDebriefApi'
import { useTripDebriefStore, type TripDebriefListView } from '../stores/tripDebriefStore'
import type { TripDebriefApi, TripDebriefSearchColumn } from '../types/tripDebrief.types'

const { t } = useI18n()
const store = useTripDebriefStore()
const { formatDate, formatDateTime, formatDecimal, formatInteger, optionLabel } =
  useListCellFormatters()

const listViewOptions = computed<{ value: TripDebriefListView; label: string }[]>(() => [
  { value: 'open', label: t('fleet.tripDebriefs.listView.open') },
  { value: 'closed', label: t('fleet.tripDebriefs.listView.closed') },
  { value: 'all', label: t('fleet.tripDebriefs.listView.all') }
])

const searchColumnOptions = computed<{ value: TripDebriefSearchColumn; label: string }[]>(() => [
  { value: 'no,voucherNo,employeeName,vehiclePlate', label: t('fleet.tripDebriefs.search.all') },
  { value: 'no', label: t('fleet.tripDebriefs.col.no') },
  { value: 'voucherNo', label: t('fleet.tripDebriefs.col.voucherNo') },
  { value: 'employeeName', label: t('fleet.tripDebriefs.col.employeeName') },
  { value: 'vehiclePlate', label: t('fleet.tripDebriefs.col.vehiclePlate') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.tripDebriefs.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'voucherNo', label: t('fleet.tripDebriefs.col.voucherNo'), minW: '120px' },
  { sortKey: 'employeeName', label: t('fleet.tripDebriefs.col.employeeName'), minW: '180px' },
  { sortKey: 'vehiclePlate', label: t('fleet.tripDebriefs.col.vehiclePlate'), minW: '120px' },
  {
    sortKey: 'loadedOn',
    label: t('fleet.tripDebriefs.col.loadedOn'),
    minW: '120px',
    formatter: formatDate
  },
  {
    sortKey: 'unloadedOn',
    label: t('fleet.tripDebriefs.col.unloadedOn'),
    minW: '120px',
    formatter: formatDate
  },
  {
    sortKey: 'deliveryPlace',
    label: t('fleet.tripDebriefs.col.deliveryPlace'),
    minW: '170px',
    defaultHidden: true
  },
  {
    sortKey: 'distanceKm',
    label: t('fleet.tripDebriefs.col.distanceKm'),
    minW: '110px',
    formatter: formatInteger
  },
  {
    sortKey: 'infractionTotal',
    label: t('fleet.tripDebriefs.col.infractionTotal'),
    minW: '130px',
    formatter: formatInteger
  },
  {
    sortKey: 'infractionRate',
    label: t('fleet.tripDebriefs.col.infractionRate'),
    minW: '170px',
    formatter: formatDecimal
  },
  {
    sortKey: 'gainLoss',
    label: t('fleet.tripDebriefs.col.gainLoss'),
    minW: '120px',
    defaultHidden: true,
    formatter: formatDecimal
  },
  {
    sortKey: 'status',
    label: t('fleet.tripDebriefs.col.status'),
    minW: '140px',
    formatter: optionLabel('tripDebriefStatus')
  },
  {
    sortKey: 'closedOn',
    label: t('fleet.tripDebriefs.col.closedOn'),
    minW: '120px',
    defaultHidden: true,
    formatter: formatDate
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
    labelKey: 'fleet.tripDebriefs.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'tripDebriefStatus'
  }
]

const detailKeys = [
  'employeeName',
  'vehiclePlate',
  'unloadedOn',
  'distanceKm',
  'infractionTotal',
  'status'
]
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: TripDebriefApi, column: TableColumn): string {
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
} = useListPage<TripDebriefApi, TripDebriefSearchColumn>({
  tableId: 'fleet-trip-debriefs',
  feature: 'TRIPDEBRIEF',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'trip-debriefs',
  exportApi: tripDebriefApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.tripDebriefs.title')"
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
        @update:list-view="store.setListView($event as TripDebriefListView)"
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
        :loading-text="t('fleet.tripDebriefs.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('fleet.tripDebriefs.noResultsCreate') : t('fleet.tripDebriefs.noResults')
        "
        :no-search-results-message="
          t('fleet.tripDebriefs.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as TripDebriefApi)"
        @row-dblclick="(item) => openFromList((item as TripDebriefApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <TripDebriefStatusPill :status="(item as TripDebriefApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as TripDebriefListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.tripDebriefs.col.voucherNo') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.voucherNo }}</p>
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

    <TripDebriefCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :item-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <TripDebriefCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
