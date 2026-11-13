<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { driverReportApi } from '../api/driverReportApi'
import { useDriverReportStore, type DriverReportListView } from '../stores/driverReportStore'
import type { DriverReportApi, DriverReportSearchColumn } from '../types/driverReport.types'

const { t } = useI18n()
const store = useDriverReportStore()
const { booleanLabel, formatDate, formatDateTime, optionLabel } = useListCellFormatters()

const listViewOptions = computed<{ value: DriverReportListView; label: string }[]>(() => [
  { value: 'pending', label: t('fleet.driverReports.listView.pending') },
  { value: 'closed', label: t('fleet.driverReports.listView.closed') },
  { value: 'all', label: t('fleet.driverReports.listView.all') }
])

const searchColumnOptions = computed<{ value: DriverReportSearchColumn; label: string }[]>(() => [
  { value: 'no,employeeName,subject', label: t('fleet.driverReports.search.all') },
  { value: 'no', label: t('fleet.driverReports.col.no') },
  { value: 'employeeName', label: t('fleet.driverReports.col.employeeName') },
  { value: 'subject', label: t('fleet.driverReports.col.subject') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.driverReports.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'subject', label: t('fleet.driverReports.col.subject'), minW: '240px' },
  {
    sortKey: 'kind',
    label: t('fleet.driverReports.col.kind'),
    minW: '170px',
    formatter: optionLabel('driverReportKind')
  },
  {
    sortKey: 'severity',
    label: t('fleet.driverReports.col.severity'),
    minW: '110px',
    formatter: optionLabel('driverReportSeverity')
  },
  {
    sortKey: 'urgency',
    label: t('fleet.driverReports.col.urgency'),
    minW: '130px',
    formatter: optionLabel('driverReportUrgency')
  },
  { sortKey: 'employeeName', label: t('fleet.driverReports.col.employeeName'), minW: '180px' },
  {
    sortKey: 'occurredOn',
    label: t('fleet.driverReports.col.occurredOn'),
    minW: '120px',
    formatter: formatDate
  },
  {
    sortKey: 'reportedOn',
    label: t('fleet.driverReports.col.reportedOn'),
    minW: '120px',
    formatter: formatDate
  },
  {
    sortKey: 'within24h',
    label: t('fleet.driverReports.col.within24h'),
    minW: '110px',
    formatter: booleanLabel
  },
  {
    sortKey: 'channel',
    label: t('fleet.driverReports.col.channel'),
    minW: '140px',
    defaultHidden: true,
    formatter: optionLabel('driverReportChannel')
  },
  {
    sortKey: 'status',
    label: t('fleet.driverReports.col.status'),
    minW: '120px',
    formatter: optionLabel('driverReportStatus')
  },
  {
    sortKey: 'ownerName',
    label: t('fleet.driverReports.col.ownerName'),
    minW: '160px',
    defaultHidden: true
  },
  {
    sortKey: 'dueOn',
    label: t('fleet.driverReports.col.dueOn'),
    minW: '120px',
    formatter: formatDate
  },
  {
    sortKey: 'closedOn',
    label: t('fleet.driverReports.col.closedOn'),
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
    labelKey: 'fleet.driverReports.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'driverReportStatus'
  },
  {
    field: 'kind',
    labelKey: 'fleet.driverReports.col.kind',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'driverReportKind'
  },
  {
    field: 'severity',
    labelKey: 'fleet.driverReports.col.severity',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'driverReportSeverity'
  },
  {
    field: 'urgency',
    labelKey: 'fleet.driverReports.col.urgency',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'driverReportUrgency'
  }
]

const detailKeys = ['employeeName', 'kind', 'severity', 'urgency', 'reportedOn', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: DriverReportApi, column: TableColumn): string {
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
} = useListPage<DriverReportApi, DriverReportSearchColumn>({
  tableId: 'fleet-driver-reports',
  feature: 'DRIVERREPORT',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'driver-reports',
  exportApi: driverReportApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.driverReports.title')"
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
        @update:list-view="store.setListView($event as DriverReportListView)"
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
        :loading-text="t('fleet.driverReports.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('fleet.driverReports.noResultsCreate') : t('fleet.driverReports.noResults')
        "
        :no-search-results-message="
          t('fleet.driverReports.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as DriverReportApi)"
        @row-dblclick="(item) => openFromList((item as DriverReportApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <DriverReportStatusPill :status="(item as DriverReportApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as DriverReportListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.driverReports.col.subject') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.subject }}</p>
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

    <DriverReportCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :item-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <DriverReportCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
