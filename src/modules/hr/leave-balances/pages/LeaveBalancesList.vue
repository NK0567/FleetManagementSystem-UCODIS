<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import type { ListFilter } from '@/core/types/crud.types'
import { useReferenceStore } from '@/stores/referenceStore'
import { formatNumber } from '@/utils/format'
import { leaveBalanceApi } from '../api/leaveBalanceApi'
import { useLeaveBalanceStore } from '../stores/leaveBalanceStore'
import type { LeaveBalanceApi, LeaveBalanceSearchColumn } from '../types/leaveBalance.types'

const ALL_TYPES = 'all'

const { t } = useI18n()
const store = useLeaveBalanceStore()
const referenceStore = useReferenceStore()
const { formatDecimal } = useListCellFormatters()

/** One quick view per leave type, built as a filter the user can still edit in the panel. */
const listViewOptions = computed(() => [
  { value: ALL_TYPES, label: t('hr.leaveBalances.listView.all') },
  ...referenceStore
    .getItems('leaveTypes')
    .filter((type) => type.active !== false)
    .map((type) => ({ value: type.code, label: type.description }))
])

const listView = computed(
  () => store.userFilters.find((filter) => filter.field === 'leaveTypeNo')?.value ?? ALL_TYPES
)

function setListView(view: string) {
  const others = store.userFilters.filter((filter) => filter.field !== 'leaveTypeNo')
  const typeFilter: ListFilter[] =
    view === ALL_TYPES ? [] : [{ field: 'leaveTypeNo', valueType: 'string', value: view }]
  void store.setUserFilters([...others, ...typeFilter])
}

const searchColumnOptions = computed<{ value: LeaveBalanceSearchColumn; label: string }[]>(() => [
  { value: 'employeeNo,employeeName', label: t('hr.leaveBalances.search.all') },
  { value: 'employeeNo', label: t('hr.leaveBalances.col.employeeNo') },
  { value: 'employeeName', label: t('hr.leaveBalances.col.employeeName') }
])

const days = (key: keyof LeaveBalanceApi, minW = '110px'): TableColumn => ({
  sortKey: key,
  label: t(`hr.leaveBalances.col.${key}`),
  minW,
  align: 'right',
  formatter: formatDecimal
})

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'employeeNo', label: t('hr.leaveBalances.col.employeeNo'), minW: '100px' },
  { sortKey: 'employeeName', label: t('hr.leaveBalances.col.employeeName'), minW: '200px' },
  { sortKey: 'leaveTypeName', label: t('hr.leaveBalances.col.leaveTypeName'), minW: '180px' },
  days('entitlementDays'),
  days('carriedOverDays'),
  days('adjustmentDays'),
  days('takenDays'),
  days('pendingDays'),
  days('remainingDays'),
  {
    ...days('availableDays'),
    cellClass: (value) => (Number(value) < 0 ? 'text-destructive font-medium' : 'font-medium')
  },
  { sortKey: 'year', label: t('hr.leaveBalances.col.year'), minW: '80px', defaultHidden: true }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'leaveTypeNo',
    labelKey: 'hr.leaveBalances.col.leaveTypeName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'leaveTypes'
  },
  {
    field: 'orgUnitNo',
    labelKey: 'hr.leaveBalances.col.orgUnitNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'orgUnits'
  }
]

const {
  showFilterPanel,
  appliedFilterCount,
  showDetailsPanel,
  hideListContent,
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
  onSort,
  onSearchColumnChange,
  onUpdateUserFilters,
  onReorderColumns
} = useListPage<LeaveBalanceApi, LeaveBalanceSearchColumn>({
  tableId: 'hr-leave-balances',
  feature: 'LEAVEBALANCE',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'leave-balances',
  exportApi: leaveBalanceApi.exportExcel,
  hasCard: false
})

onMounted(() => void referenceStore.fetchAll())
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('hr.leaveBalances.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-create="false"
        :list-view-options="listViewOptions"
        :list-view="String(listView)"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @update:list-view="setListView"
        @toggle-filter="showFilterPanel = !showFilterPanel"
        @toggle-details="showDetailsPanel = !showDetailsPanel"
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
        :loading-text="t('hr.leaveBalances.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('hr.leaveBalances.noResults')"
        :no-search-results-message="
          t('hr.leaveBalances.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as LeaveBalanceApi)"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="String(listView)"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="setListView"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="font-semibold text-primary">{{ store.selectedItem.employeeName }}</p>
                  <p class="text-muted-foreground">
                    {{ store.selectedItem.leaveTypeName }} · {{ store.selectedItem.year }}
                  </p>
                </div>
                <dl class="space-y-1.5">
                  <div
                    v-for="line in [
                      { key: 'entitlementDays', sign: '' },
                      { key: 'carriedOverDays', sign: '+' },
                      { key: 'adjustmentDays', sign: '+' },
                      { key: 'takenDays', sign: '−' },
                      { key: 'remainingDays', sign: '=' },
                      { key: 'pendingDays', sign: '−' },
                      { key: 'availableDays', sign: '=' }
                    ] as const"
                    :key="line.key"
                    class="flex justify-between gap-4"
                    :class="line.sign === '=' ? 'border-t border-border pt-1.5 font-semibold' : ''"
                  >
                    <dt class="text-muted-foreground">
                      {{ line.sign }} {{ t(`hr.leaveBalances.col.${line.key}`) }}
                    </dt>
                    <dd class="tabular-nums">
                      {{ formatNumber(store.selectedItem[line.key], 1) }}
                    </dd>
                  </div>
                </dl>
              </div>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>
  </div>
</template>
