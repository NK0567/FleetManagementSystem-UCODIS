<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { infractionApi } from '../api/infractionApi'
import { useInfractionStore, type InfractionListView } from '../stores/infractionStore'
import type { InfractionApi, InfractionSearchColumn } from '../types/infraction.types'

const { t } = useI18n()
const store = useInfractionStore()
const { formatDateTime, optionLabel, formatInteger } = useListCellFormatters()

const listViewOptions = computed<{ value: InfractionListView; label: string }[]>(() => [
  { value: 'open', label: t('fleet.infractions.listView.open') },
  { value: 'closed', label: t('fleet.infractions.listView.closed') },
  { value: 'all', label: t('fleet.infractions.listView.all') }
])

const searchColumnOptions = computed<{ value: InfractionSearchColumn; label: string }[]>(() => [
  { value: 'no,vehiclePlate,driverName,location', label: t('fleet.infractions.search.all') },
  { value: 'no', label: t('fleet.infractions.col.no') },
  { value: 'vehiclePlate', label: t('fleet.infractions.col.vehiclePlate') },
  { value: 'driverName', label: t('fleet.infractions.col.driverName') },
  { value: 'location', label: t('fleet.infractions.col.location') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.infractions.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'occurredAt',
    label: t('fleet.infractions.col.occurredAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  { sortKey: 'location', label: t('fleet.infractions.col.location'), minW: '180px' },
  {
    sortKey: 'severity',
    label: t('fleet.infractions.col.severity'),
    minW: '110px',
    formatter: optionLabel('infractionSeverity')
  },
  {
    sortKey: 'fineAmount',
    label: t('fleet.infractions.col.fineAmount'),
    minW: '120px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'infractionTypeName',
    label: t('fleet.infractions.col.infractionTypeName'),
    minW: '200px'
  },
  { sortKey: 'vehiclePlate', label: t('fleet.infractions.col.vehiclePlate'), minW: '120px' },
  { sortKey: 'driverName', label: t('fleet.infractions.col.driverName'), minW: '170px' },
  {
    sortKey: 'source',
    label: t('fleet.infractions.col.source'),
    minW: '110px',
    defaultHidden: true,
    formatter: optionLabel('infractionSource')
  },
  {
    sortKey: 'status',
    label: t('fleet.infractions.col.status'),
    minW: '120px',
    formatter: optionLabel('infractionStatus')
  },
  {
    sortKey: 'outcome',
    label: t('fleet.infractions.col.outcome'),
    minW: '160px',
    defaultHidden: true,
    formatter: optionLabel('infractionOutcome')
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
    labelKey: 'fleet.infractions.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'infractionStatus'
  },
  {
    field: 'infractionTypeNo',
    labelKey: 'fleet.infractions.col.infractionTypeNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'infractionTypes'
  },
  {
    field: 'severity',
    labelKey: 'fleet.infractions.col.severity',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'infractionSeverity'
  }
]

const detailKeys = ['infractionTypeName', 'vehiclePlate', 'driverName', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: InfractionApi, column: TableColumn): string {
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
} = useListPage<InfractionApi, InfractionSearchColumn>({
  tableId: 'fleet-infractions',
  feature: 'INFRACTION',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'infractions',
  exportApi: infractionApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.infractions.title')"
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
        @update:list-view="store.setListView($event as InfractionListView)"
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
        :loading-text="t('fleet.infractions.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.infractions.noResults')"
        :no-search-results-message="
          t('fleet.infractions.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as InfractionApi)"
        @row-dblclick="(item) => openFromList((item as InfractionApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <InfractionStatusPill :status="(item as InfractionApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as InfractionListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.infractions.col.infractionTypeName') }}
                  </p>
                  <p class="font-semibold text-primary">
                    {{ store.selectedItem.infractionTypeName }}
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

    <InfractionCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :infraction-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <InfractionCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
