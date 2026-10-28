<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { insurancePolicyApi } from '../api/insurancePolicyApi'
import { insurancePolicyService } from '../services/insurancePolicyService'
import {
  useInsurancePolicyStore,
  type InsurancePolicyListView
} from '../stores/insurancePolicyStore'
import type {
  InsurancePolicyApi,
  InsurancePolicySearchColumn
} from '../types/insurancePolicy.types'

const { t } = useI18n()
const store = useInsurancePolicyStore()
const { formatDateTime, optionLabel, formatDate, formatInteger } = useListCellFormatters()

const listViewOptions = computed<{ value: InsurancePolicyListView; label: string }[]>(() => [
  { value: 'inForce', label: t('fleet.insurancePolicies.listView.inForce') },
  { value: 'toRenew', label: t('fleet.insurancePolicies.listView.toRenew') },
  { value: 'all', label: t('fleet.insurancePolicies.listView.all') }
])

const searchColumnOptions = computed<{ value: InsurancePolicySearchColumn; label: string }[]>(
  () => [
    {
      value: 'no,policyNumber,vehiclePlate,insurerName',
      label: t('fleet.insurancePolicies.search.all')
    },
    { value: 'no', label: t('fleet.insurancePolicies.col.no') },
    { value: 'policyNumber', label: t('fleet.insurancePolicies.col.policyNumber') },
    { value: 'vehiclePlate', label: t('fleet.insurancePolicies.col.vehiclePlate') },
    { value: 'insurerName', label: t('fleet.insurancePolicies.col.insurerName') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.insurancePolicies.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'policyNumber', label: t('fleet.insurancePolicies.col.policyNumber'), minW: '150px' },
  {
    sortKey: 'coverage',
    label: t('fleet.insurancePolicies.col.coverage'),
    minW: '170px',
    formatter: optionLabel('insuranceCoverage')
  },
  {
    sortKey: 'startDate',
    label: t('fleet.insurancePolicies.col.startDate'),
    minW: '110px',
    formatter: formatDate
  },
  {
    sortKey: 'endDate',
    label: t('fleet.insurancePolicies.col.endDate'),
    minW: '110px',
    formatter: formatDate
  },
  {
    sortKey: 'annualPremium',
    label: t('fleet.insurancePolicies.col.annualPremium'),
    minW: '130px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'deductible',
    label: t('fleet.insurancePolicies.col.deductible'),
    minW: '110px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  { sortKey: 'vehiclePlate', label: t('fleet.insurancePolicies.col.vehiclePlate'), minW: '120px' },
  { sortKey: 'insurerName', label: t('fleet.insurancePolicies.col.insurerName'), minW: '180px' },
  {
    sortKey: 'state',
    label: t('fleet.insurancePolicies.col.state'),
    minW: '120px',
    formatter: optionLabel('policyState')
  },
  {
    sortKey: 'claimCount',
    label: t('fleet.insurancePolicies.col.claimCount'),
    minW: '90px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
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
    field: 'state',
    labelKey: 'fleet.insurancePolicies.col.state',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'policyState'
  },
  {
    field: 'coverage',
    labelKey: 'fleet.insurancePolicies.col.coverage',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'insuranceCoverage'
  }
]

const detailKeys = ['vehiclePlate', 'insurerName', 'endDate', 'state']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: InsurancePolicyApi, column: TableColumn): string {
  return getListCellDisplay(
    (item as unknown as Record<string, unknown>)[column.sortKey],
    item,
    column
  )
}

const {
  canInsert,
  canDelete,
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
  itemToDelete,
  deleting,
  deleteError,
  askDelete,
  confirmDelete,
  onSort,
  onSearchColumnChange,
  onUpdateUserFilters,
  onReorderColumns
} = useListPage<InsurancePolicyApi, InsurancePolicySearchColumn>({
  tableId: 'fleet-insurance-policies',
  feature: 'INSURANCEPOLICY',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'insurance-policies',
  exportApi: insurancePolicyApi.exportExcel,
  remove: insurancePolicyService.remove,
  deleteErrorFallback: t('fleet.insurancePolicies.deleteError')
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.insurancePolicies.title')"
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
        @update:list-view="store.setListView($event as InsurancePolicyListView)"
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

      <FormAlerts
        class="mx-4"
        :error="deleteError ?? exportError"
        @clear:error="deleteError = exportError = null"
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
        :loading-text="t('fleet.insurancePolicies.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.insurancePolicies.noResults')"
        :no-search-results-message="
          t('fleet.insurancePolicies.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as InsurancePolicyApi)"
        @row-dblclick="(item) => openFromList((item as InsurancePolicyApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-state="{ item }">
          <PolicyStatePill :state="(item as InsurancePolicyApi).state" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as InsurancePolicyListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.insurancePolicies.col.policyNumber') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.policyNumber }}</p>
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
              <button
                v-if="canDelete && store.selectedItem.claimCount === 0"
                type="button"
                class="px-3 py-2 border border-destructive text-destructive text-sm rounded hover:bg-destructive/10 transition font-medium"
                @click="askDelete(store.selectedItem)"
              >
                {{ t('common.delete') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <ConfirmDialog
      :open="!!itemToDelete"
      :title="t('fleet.insurancePolicies.confirmDelete')"
      :message="t('fleet.insurancePolicies.confirmDeleteMsg', { name: itemToDelete?.policyNumber })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <InsurancePolicyCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :insurance-policy-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <InsurancePolicyCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
