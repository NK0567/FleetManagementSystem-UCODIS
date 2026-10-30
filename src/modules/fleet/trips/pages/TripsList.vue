<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { tripApi } from '../api/tripApi'
import { tripService } from '../services/tripService'
import { useTripStore, type TripListView } from '../stores/tripStore'
import type { TripApi, TripSearchColumn, TripSummaryApi } from '../types/trip.types'

const { t } = useI18n()
const store = useTripStore()
const { formatDateTime, formatInteger, formatDecimal, optionLabel } = useListCellFormatters()

const listViewOptions = computed<{ value: TripListView; label: string }[]>(() => [
  { value: 'open', label: t('fleet.trips.listView.open') },
  { value: 'done', label: t('fleet.trips.listView.done') },
  { value: 'all', label: t('fleet.trips.listView.all') }
])

const searchColumnOptions = computed<{ value: TripSearchColumn; label: string }[]>(() => [
  { value: 'no,vehiclePlate,driverName', label: t('fleet.trips.search.all') },
  { value: 'no', label: t('fleet.trips.col.no') },
  { value: 'vehiclePlate', label: t('fleet.trips.col.vehiclePlate') },
  { value: 'driverName', label: t('fleet.trips.col.driverName') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.trips.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'routeName', label: t('fleet.trips.col.routeTemplateNo'), minW: '260px' },
  {
    sortKey: 'plannedDeparture',
    label: t('fleet.trips.col.plannedDeparture'),
    minW: '150px',
    formatter: formatDateTime
  },
  {
    sortKey: 'plannedArrival',
    label: t('fleet.trips.col.plannedArrival'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
  },
  {
    sortKey: 'actualDeparture',
    label: t('fleet.trips.col.actualDeparture'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
  },
  {
    sortKey: 'actualArrival',
    label: t('fleet.trips.col.actualArrival'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
  },
  { sortKey: 'vehiclePlate', label: t('fleet.trips.col.vehicleNo'), minW: '120px' },
  { sortKey: 'trailerPlate', label: t('fleet.trips.col.trailerNo'), minW: '120px' },
  { sortKey: 'driverName', label: t('fleet.trips.col.driverNo'), minW: '180px' },
  {
    sortKey: 'status',
    label: t('fleet.trips.col.status'),
    minW: '140px',
    formatter: optionLabel('tripStatus')
  },
  {
    sortKey: 'passedStopCount',
    label: t('fleet.trips.col.passedStopCount'),
    minW: '110px',
    align: 'right',
    formatter: (value, item) => `${formatInteger(value, item)} / ${(item as TripApi).stopCount}`
  },
  {
    sortKey: 'missedStopCount',
    label: t('fleet.trips.col.missedStopCount'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'distanceKm',
    label: t('fleet.trips.col.distanceKm'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'kmGapPercent',
    label: t('fleet.trips.col.kmGapPercent'),
    minW: '110px',
    align: 'right',
    defaultHidden: true,
    formatter: formatDecimal
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
    labelKey: 'fleet.trips.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'tripStatus'
  },
  {
    field: 'routeTemplateNo',
    labelKey: 'fleet.trips.col.routeTemplateNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'routeTemplates'
  },
  {
    field: 'vehicleNo',
    labelKey: 'fleet.trips.col.vehicleNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'motorizedVehicles'
  },
  {
    field: 'trailerNo',
    labelKey: 'fleet.trips.col.trailerNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'trailers'
  },
  {
    field: 'driverNo',
    labelKey: 'fleet.trips.col.driverNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'drivers'
  },
  {
    field: 'hasMissedStops',
    labelKey: 'fleet.trips.filter.hasMissedStops',
    valueType: 'boolean',
    kind: 'boolean'
  }
]

const detailKeys = ['vehiclePlate', 'trailerPlate', 'driverName', 'plannedDeparture']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: TripApi, column: TableColumn): string {
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
} = useListPage<TripApi, TripSearchColumn>({
  tableId: 'fleet-trips',
  feature: 'TRIP',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'trips',
  exportApi: tripApi.exportExcel
})

const summary = ref<TripSummaryApi | null>(null)

async function loadSummary() {
  summary.value = await tripService.summary().catch(() => null)
}

onMounted(loadSummary)
watch(() => store.items, loadSummary)

/** The indicator opens the trips that left a stop behind. */
function showMissedStops() {
  onUpdateUserFilters([
    ...store.userFilters.filter((filter) => filter.field !== 'hasMissedStops'),
    { field: 'hasMissedStops', valueType: 'boolean', value: true }
  ])
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.trips.title')"
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
        @update:list-view="store.setListView($event as TripListView)"
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

      <p v-if="summary" class="mx-4 mt-2 text-xs text-muted-foreground">
        <button
          type="button"
          class="cursor-pointer hover:underline"
          :class="summary.missedStops ? 'text-destructive font-medium' : ''"
          @click="showMissedStops"
        >
          {{
            t('fleet.trips.missedStopsSummary', {
              stops: summary.missedStops,
              trips: summary.tripsWithMissedStops
            })
          }}
        </button>
      </p>
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
        :loading-text="t('fleet.trips.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('fleet.trips.noResultsCreate') : t('fleet.trips.noResults')
        "
        :no-search-results-message="t('fleet.trips.noSearchResults', { query: store.searchQuery })"
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
        @select-item="(item) => store.selectItem(item as TripApi)"
        @row-dblclick="(item) => openFromList((item as TripApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <TripStatusPill :status="(item as TripApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as TripListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.trips.col.routeName') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.routeName }}</p>
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

    <TripCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :trip-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <TripCreateModal v-if="showCreateModal" @close="showCreateModal = false" @created="onCreated" />
  </div>
</template>
