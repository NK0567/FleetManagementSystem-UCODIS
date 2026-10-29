<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleDot } from '@lucide/vue'
import VehicleTyrePlan from '../components/VehicleTyrePlan.vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { tyreApi } from '../api/tyreApi'
import { useTyreStore, type TyreListView } from '../stores/tyreStore'
import type { TyreApi, TyreSearchColumn } from '../types/tyre.types'

const { t } = useI18n()
const store = useTyreStore()
const showPlan = ref(false)
const { formatDateTime, referenceLabel, formatInteger, formatDate, formatDecimal, optionLabel } =
  useListCellFormatters()

const listViewOptions = computed<{ value: TyreListView; label: string }[]>(() => [
  { value: 'mounted', label: t('maintenance.tyres.listView.mounted') },
  { value: 'stock', label: t('maintenance.tyres.listView.stock') },
  { value: 'alerts', label: t('maintenance.tyres.listView.alerts') },
  { value: 'all', label: t('maintenance.tyres.listView.all') }
])

const searchColumnOptions = computed<{ value: TyreSearchColumn; label: string }[]>(() => [
  { value: 'no,serialNumber,make,vehiclePlate', label: t('maintenance.tyres.search.all') },
  { value: 'no', label: t('maintenance.tyres.col.no') },
  { value: 'serialNumber', label: t('maintenance.tyres.col.serialNumber') },
  { value: 'make', label: t('maintenance.tyres.col.make') },
  { value: 'vehiclePlate', label: t('maintenance.tyres.col.vehiclePlate') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('maintenance.tyres.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'serialNumber', label: t('maintenance.tyres.col.serialNumber'), minW: '140px' },
  { sortKey: 'make', label: t('maintenance.tyres.col.make'), minW: '120px' },
  { sortKey: 'size', label: t('maintenance.tyres.col.size'), minW: '130px' },
  {
    sortKey: 'supplierNo',
    label: t('maintenance.tyres.col.supplierNo'),
    minW: '180px',
    defaultHidden: true,
    formatter: referenceLabel('tyreSuppliers')
  },
  {
    sortKey: 'price',
    label: t('maintenance.tyres.col.price'),
    minW: '120px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'purchaseDate',
    label: t('maintenance.tyres.col.purchaseDate'),
    minW: '120px',
    defaultHidden: true,
    formatter: formatDate
  },
  {
    sortKey: 'status',
    label: t('maintenance.tyres.col.status'),
    minW: '120px',
    formatter: optionLabel('tyreStatus')
  },
  { sortKey: 'vehiclePlate', label: t('maintenance.tyres.col.vehiclePlate'), minW: '110px' },
  { sortKey: 'positionCode', label: t('maintenance.tyres.col.positionCode'), minW: '90px' },
  {
    sortKey: 'kmRun',
    label: t('maintenance.tyres.col.kmRun'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'costPerKm',
    label: t('maintenance.tyres.col.costPerKm'),
    minW: '110px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'alert',
    label: t('maintenance.tyres.col.alert'),
    minW: '120px',
    formatter: optionLabel('tyreAlert')
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
    labelKey: 'maintenance.tyres.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'tyreStatus'
  },
  {
    field: 'alert',
    labelKey: 'maintenance.tyres.col.alert',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'tyreAlert'
  },
  {
    field: 'supplierNo',
    labelKey: 'maintenance.tyres.col.supplierNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'tyreSuppliers'
  }
]

const detailKeys = ['status', 'vehiclePlate', 'positionCode', 'kmRun']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: TyreApi, column: TableColumn): string {
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
} = useListPage<TyreApi, TyreSearchColumn>({
  tableId: 'maintenance-tyres',
  feature: 'TYRE',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'tyres',
  exportApi: tyreApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.tyres.title')"
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
        @update:list-view="store.setListView($event as TyreListView)"
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
        <template #extra-actions>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
            :class="showPlan ? 'bg-accent' : ''"
            :aria-pressed="showPlan"
            @click="showPlan = !showPlan"
          >
            <CircleDot class="w-4 h-4 text-primary" />
            {{ t('maintenance.tyres.plan.action') }}
          </button>
        </template>
      </ListPageToolbar>

      <FormAlerts class="mx-4" :error="exportError" @clear:error="exportError = null" />
      <VehicleTyrePlan
        v-if="showPlan"
        @changed="store.fetchItems(store.pagination.page, store.pagination.limit)"
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
        :loading-text="t('maintenance.tyres.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('maintenance.tyres.noResults')"
        :no-search-results-message="
          t('maintenance.tyres.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as TyreApi)"
        @row-dblclick="(item) => openFromList((item as TyreApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as TyreListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('maintenance.tyres.col.serialNumber') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.serialNumber }}</p>
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

    <TyreCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :tyre-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <TyreCreateModal v-if="showCreateModal" @close="showCreateModal = false" @created="onCreated" />
  </div>
</template>
