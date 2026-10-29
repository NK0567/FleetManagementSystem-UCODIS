<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { telematicsEventApi } from '../api/telematicsEventApi'
import {
  useTelematicsEventStore,
  type TelematicsEventListView
} from '../stores/telematicsEventStore'
import type {
  TelematicsEventApi,
  TelematicsEventSearchColumn
} from '../types/telematicsEvent.types'

const { t } = useI18n()
const store = useTelematicsEventStore()
const route = useRoute()
// Coming from the map: the events of the chosen vehicle.
onMounted(() => {
  const plate = route.query.plate
  if (typeof plate === 'string' && plate) void store.search(plate)
})
const { formatDateTime, optionLabel, formatDecimal } = useListCellFormatters()

const listViewOptions = computed<{ value: TelematicsEventListView; label: string }[]>(() => [
  { value: 'toHandle', label: t('fleet.telematicsEvents.listView.toHandle') },
  { value: 'handled', label: t('fleet.telematicsEvents.listView.handled') },
  { value: 'all', label: t('fleet.telematicsEvents.listView.all') }
])

const searchColumnOptions = computed<{ value: TelematicsEventSearchColumn; label: string }[]>(
  () => [
    { value: 'no,vehiclePlate,driverName,siteName', label: t('fleet.telematicsEvents.search.all') },
    { value: 'no', label: t('fleet.telematicsEvents.col.no') },
    { value: 'vehiclePlate', label: t('fleet.telematicsEvents.col.vehiclePlate') },
    { value: 'driverName', label: t('fleet.telematicsEvents.col.driverName') },
    { value: 'siteName', label: t('fleet.telematicsEvents.col.siteName') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.telematicsEvents.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'occurredAt',
    label: t('fleet.telematicsEvents.col.occurredAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  {
    sortKey: 'source',
    label: t('fleet.telematicsEvents.col.source'),
    minW: '110px',
    defaultHidden: true,
    formatter: optionLabel('telematicsSource')
  },
  {
    sortKey: 'value',
    label: t('fleet.telematicsEvents.col.value'),
    minW: '100px',
    align: 'right',
    formatter: formatDecimal
  },
  { sortKey: 'eventTypeName', label: t('fleet.telematicsEvents.col.eventTypeName'), minW: '200px' },
  { sortKey: 'vehiclePlate', label: t('fleet.telematicsEvents.col.vehiclePlate'), minW: '120px' },
  { sortKey: 'driverName', label: t('fleet.telematicsEvents.col.driverName'), minW: '170px' },
  { sortKey: 'siteName', label: t('fleet.telematicsEvents.col.siteName'), minW: '170px' },
  {
    sortKey: 'family',
    label: t('fleet.telematicsEvents.col.family'),
    minW: '120px',
    formatter: optionLabel('telematicsFamily')
  },
  {
    sortKey: 'severity',
    label: t('fleet.telematicsEvents.col.severity'),
    minW: '110px',
    formatter: optionLabel('telematicsSeverity')
  },
  { sortKey: 'status', label: t('fleet.telematicsEvents.col.status'), minW: '120px' },
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
    field: 'source',
    labelKey: 'fleet.telematicsEvents.col.source',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'telematicsSource'
  },
  {
    field: 'family',
    labelKey: 'fleet.telematicsEvents.col.family',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'telematicsFamily'
  },
  {
    field: 'severity',
    labelKey: 'fleet.telematicsEvents.col.severity',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'telematicsSeverity'
  }
]

const detailKeys = ['eventTypeName', 'vehiclePlate', 'driverName', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: TelematicsEventApi, column: TableColumn): string {
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
} = useListPage<TelematicsEventApi, TelematicsEventSearchColumn>({
  tableId: 'fleet-telematics-events',
  feature: 'TELEMATICS',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'telematics-events',
  exportApi: telematicsEventApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.telematicsEvents.title')"
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
        @update:list-view="store.setListView($event as TelematicsEventListView)"
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
        :loading-text="t('fleet.telematicsEvents.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.telematicsEvents.noResults')"
        :no-search-results-message="
          t('fleet.telematicsEvents.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as TelematicsEventApi)"
        @row-dblclick="(item) => openFromList((item as TelematicsEventApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <TelematicsEventStatusPill :status="(item as TelematicsEventApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as TelematicsEventListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.telematicsEvents.col.eventTypeName') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.eventTypeName }}</p>
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

    <TelematicsEventCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :telematics-event-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <TelematicsEventCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
