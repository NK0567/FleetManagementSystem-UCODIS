<script lang="ts" setup>
import { computed, ref } from 'vue'
import { Upload } from '@lucide/vue'
import { usePermissions } from '@/composables/usePermissions'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { MoreAction } from '@/components/shared/MoreActionsMenu.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { workOrderApi } from '../api/workOrderApi'
import { useWorkOrderStore, type WorkOrderListView } from '../stores/workOrderStore'
import type { WorkOrderApi, WorkOrderSearchColumn } from '../types/workOrder.types'

const { t } = useI18n()
const store = useWorkOrderStore()
const { canExecute } = usePermissions('WORKORDER')
const importing = ref(false)
const { formatDateTime, formatDecimal, formatInteger, optionLabel } = useListCellFormatters()

const listViewOptions = computed<{ value: WorkOrderListView; label: string }[]>(() => [
  { value: 'active', label: t('maintenance.workOrders.listView.active') },
  { value: 'awaiting_parts', label: t('maintenance.workOrders.listView.awaitingParts') },
  { value: 'external', label: t('maintenance.workOrders.listView.external') },
  { value: 'to_validate', label: t('maintenance.workOrders.listView.toValidate') },
  { value: 'finished', label: t('maintenance.workOrders.listView.finished') },
  { value: 'all', label: t('maintenance.workOrders.listView.all') }
])

const searchColumnOptions = computed<{ value: WorkOrderSearchColumn; label: string }[]>(() => [
  { value: 'no,vehiclePlate,symptom,providerName', label: t('maintenance.workOrders.search.all') },
  { value: 'no', label: t('maintenance.workOrders.col.no') },
  { value: 'vehiclePlate', label: t('maintenance.workOrders.col.vehiclePlate') },
  { value: 'symptom', label: t('maintenance.workOrders.col.symptom') },
  { value: 'providerName', label: t('maintenance.workOrders.col.providerName') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('maintenance.workOrders.col.no'), minW: '120px', cell: 'link' },
  {
    sortKey: 'declaredAt',
    label: t('maintenance.workOrders.col.declaredAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  { sortKey: 'vehiclePlate', label: t('maintenance.workOrders.col.vehiclePlate'), minW: '120px' },
  {
    sortKey: 'maintenanceType',
    label: t('maintenance.workOrders.col.maintenanceType'),
    minW: '120px',
    formatter: optionLabel('maintenanceType')
  },
  {
    sortKey: 'severity',
    label: t('maintenance.workOrders.col.severity'),
    minW: '110px',
    formatter: optionLabel('workOrderSeverity')
  },
  {
    sortKey: 'origin',
    label: t('maintenance.workOrders.col.origin'),
    minW: '150px',
    defaultHidden: true,
    formatter: optionLabel('workOrderOrigin')
  },
  { sortKey: 'symptom', label: t('maintenance.workOrders.col.symptom'), minW: '260px' },
  { sortKey: 'subsystemName', label: t('maintenance.workOrders.col.subsystemName'), minW: '170px' },
  {
    sortKey: 'labourHours',
    label: t('maintenance.workOrders.col.labourHours'),
    minW: '90px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'providerName',
    label: t('maintenance.workOrders.col.providerName'),
    minW: '180px'
  },
  {
    sortKey: 'subcontractingCost',
    label: t('maintenance.workOrders.col.subcontractingCost'),
    minW: '130px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'totalCost',
    label: t('maintenance.workOrders.col.totalCost'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'status',
    label: t('maintenance.workOrders.col.status'),
    minW: '130px',
    formatter: optionLabel('workOrderStatus')
  },
  {
    sortKey: 'nomenclatureState',
    label: t('maintenance.workOrders.col.nomenclatureState'),
    minW: '140px',
    defaultHidden: true,
    formatter: optionLabel('nomenclatureState')
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
    labelKey: 'maintenance.workOrders.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'workOrderStatus'
  },
  {
    field: 'maintenanceType',
    labelKey: 'maintenance.workOrders.col.maintenanceType',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'maintenanceType'
  },
  {
    field: 'severity',
    labelKey: 'maintenance.workOrders.col.severity',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'workOrderSeverity'
  },
  {
    field: 'origin',
    labelKey: 'maintenance.workOrders.col.origin',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'workOrderOrigin'
  },
  {
    field: 'nomenclatureState',
    labelKey: 'maintenance.workOrders.col.nomenclatureState',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'nomenclatureState'
  },
  {
    field: 'providerName',
    labelKey: 'maintenance.workOrders.col.providerName',
    valueType: 'string',
    kind: 'text'
  },
  {
    field: 'atExternalWorkshop',
    labelKey: 'maintenance.workOrders.listView.external',
    valueType: 'boolean',
    kind: 'boolean'
  }
]

const detailKeys = ['vehiclePlate', 'symptom', 'subsystemName', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: WorkOrderApi, column: TableColumn): string {
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
} = useListPage<WorkOrderApi, WorkOrderSearchColumn>({
  tableId: 'maintenance-work-orders',
  feature: 'WORKORDER',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'work-orders',
  exportApi: workOrderApi.exportExcel
})

/** Secondary gestures of the list, behind « Plus d'actions ». */
const moreActions = computed<MoreAction[]>(() => [
  {
    key: 'import',
    label: t('maintenance.workOrders.import.action'),
    icon: Upload,
    hidden: !canExecute.value,
    onSelect: () => (importing.value = true)
  }
])
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :more-actions="moreActions"
        :title="t('maintenance.workOrders.title')"
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
        @update:list-view="store.setListView($event as WorkOrderListView)"
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
        :loading-text="t('maintenance.workOrders.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert
            ? t('maintenance.workOrders.noResultsCreate')
            : t('maintenance.workOrders.noResults')
        "
        :no-search-results-message="
          t('maintenance.workOrders.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as WorkOrderApi)"
        @row-dblclick="(item) => openFromList((item as WorkOrderApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as WorkOrderListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('maintenance.workOrders.col.vehiclePlate') }}
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

    <WorkOrderCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :work-order-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <WorkOrderCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
    <HistoryImportDialog
      :open="importing"
      @close="importing = false"
      @imported="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
  </div>
</template>
