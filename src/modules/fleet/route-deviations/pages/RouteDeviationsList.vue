<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { routeDeviationApi } from '../api/routeDeviationApi'
import { routeDeviationService } from '../services/routeDeviationService'
import { useRouteDeviationStore, type RouteDeviationListView } from '../stores/routeDeviationStore'
import type {
  RouteDeviationApi,
  RouteDeviationSearchColumn,
  RouteDeviationSummary
} from '../types/routeDeviation.types'

const { t } = useI18n()
const store = useRouteDeviationStore()
const { formatDateTime, formatDecimal, optionLabel } = useListCellFormatters()

const listViewOptions = computed<{ value: RouteDeviationListView; label: string }[]>(() => [
  { value: 'toQualify', label: t('fleet.routeDeviations.listView.toQualify') },
  { value: 'qualified', label: t('fleet.routeDeviations.listView.qualified') },
  { value: 'all', label: t('fleet.routeDeviations.listView.all') }
])

const summary = ref<RouteDeviationSummary | null>(null)

async function loadSummary() {
  summary.value = await routeDeviationService.summary().catch(() => null)
}

onMounted(loadSummary)
watch(() => store.items, loadSummary)

const searchColumnOptions = computed<{ value: RouteDeviationSearchColumn; label: string }[]>(() => [
  { value: 'no,tripNo,vehiclePlate,driverName', label: t('fleet.routeDeviations.search.all') },
  { value: 'no', label: t('fleet.routeDeviations.col.no') },
  { value: 'tripNo', label: t('fleet.routeDeviations.col.tripNo') },
  { value: 'vehiclePlate', label: t('fleet.routeDeviations.col.vehiclePlate') },
  { value: 'driverName', label: t('fleet.routeDeviations.col.driverName') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.routeDeviations.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'tripNo',
    label: t('fleet.routeDeviations.col.tripNo'),
    minW: '120px'
  },
  {
    sortKey: 'detectedAt',
    label: t('fleet.routeDeviations.col.detectedAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  { sortKey: 'location', label: t('fleet.routeDeviations.col.location'), minW: '180px' },
  {
    sortKey: 'measure',
    label: t('fleet.routeDeviations.col.measure'),
    minW: '100px',
    align: 'right',
    defaultHidden: true,
    formatter: formatDecimal
  },
  {
    sortKey: 'deviationTypeName',
    label: t('fleet.routeDeviations.col.deviationTypeName'),
    minW: '200px'
  },
  { sortKey: 'vehiclePlate', label: t('fleet.routeDeviations.col.vehiclePlate'), minW: '120px' },
  { sortKey: 'driverName', label: t('fleet.routeDeviations.col.driverName'), minW: '170px' },
  {
    sortKey: 'severity',
    label: t('fleet.routeDeviations.col.severity'),
    minW: '110px',
    formatter: optionLabel('deviationSeverity')
  },
  {
    sortKey: 'nature',
    label: t('fleet.routeDeviations.col.nature'),
    minW: '130px',
    formatter: optionLabel('deviationNature')
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
    field: 'nature',
    labelKey: 'fleet.routeDeviations.col.nature',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'deviationNature'
  },
  {
    field: 'deviationTypeNo',
    labelKey: 'fleet.routeDeviations.col.deviationTypeNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'deviationTypes'
  },
  {
    field: 'tripNo',
    labelKey: 'fleet.routeDeviations.col.tripNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'openTrips'
  },
  {
    field: 'severity',
    labelKey: 'fleet.routeDeviations.col.severity',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'deviationSeverity'
  }
]

const detailKeys = ['deviationTypeName', 'vehiclePlate', 'driverName', 'nature']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: RouteDeviationApi, column: TableColumn): string {
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
} = useListPage<RouteDeviationApi, RouteDeviationSearchColumn>({
  tableId: 'fleet-route-deviations',
  feature: 'ROUTEDEVIATION',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'route-deviations',
  exportApi: routeDeviationApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.routeDeviations.title')"
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
        @update:list-view="store.setListView($event as RouteDeviationListView)"
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
        {{
          summary.complianceRate === null
            ? t('fleet.routeDeviations.summaryNoTrips', { count: summary.toQualify })
            : t('fleet.routeDeviations.summary', {
                rate: summary.complianceRate,
                count: summary.toQualify
              })
        }}
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
        :loading-text="t('fleet.routeDeviations.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert
            ? t('fleet.routeDeviations.noResultsCreate')
            : t('fleet.routeDeviations.noResults')
        "
        :no-search-results-message="
          t('fleet.routeDeviations.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as RouteDeviationApi)"
        @row-dblclick="(item) => openFromList((item as RouteDeviationApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-nature="{ item }">
          <DeviationNaturePill :nature="(item as RouteDeviationApi).nature" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as RouteDeviationListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.routeDeviations.col.deviationTypeName') }}
                  </p>
                  <p class="font-semibold text-primary">
                    {{ store.selectedItem.deviationTypeName }}
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

    <RouteDeviationCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :route-deviation-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <RouteDeviationCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
