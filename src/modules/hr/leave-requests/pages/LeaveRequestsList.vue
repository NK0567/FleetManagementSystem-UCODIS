<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { formatDate } from '@/utils/format'
import { leaveRequestApi } from '../api/leaveRequestApi'
import { useLeaveRequestStore, type LeaveRequestListView } from '../stores/leaveRequestStore'
import type { LeaveRequestApi, LeaveRequestSearchColumn } from '../types/leaveRequest.types'

const { t } = useI18n()
const store = useLeaveRequestStore()
const { formatInteger, formatDate: formatDateCell, formatDateTime } = useListCellFormatters()

const listViewOptions = computed<{ value: LeaveRequestListView; label: string }[]>(() => [
  { value: 'pending', label: t('hr.leaveRequests.listView.pending') },
  { value: 'decided', label: t('hr.leaveRequests.listView.decided') },
  { value: 'all', label: t('hr.leaveRequests.listView.all') }
])

const searchColumnOptions = computed<{ value: LeaveRequestSearchColumn; label: string }[]>(() => [
  { value: 'no,employeeName', label: t('hr.leaveRequests.search.all') },
  { value: 'no', label: t('hr.leaveRequests.col.no') },
  { value: 'employeeName', label: t('hr.leaveRequests.col.employeeName') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('hr.leaveRequests.col.no'), minW: '100px', cell: 'link' },
  { sortKey: 'employeeName', label: t('hr.leaveRequests.col.employeeName'), minW: '200px' },
  { sortKey: 'leaveTypeName', label: t('hr.leaveRequests.col.leaveTypeName'), minW: '180px' },
  {
    sortKey: 'startDate',
    label: t('hr.leaveRequests.col.startDate'),
    minW: '110px',
    formatter: formatDateCell
  },
  {
    sortKey: 'endDate',
    label: t('hr.leaveRequests.col.endDate'),
    minW: '110px',
    formatter: formatDateCell
  },
  {
    sortKey: 'days',
    label: t('hr.leaveRequests.col.days'),
    minW: '80px',
    align: 'right',
    formatter: formatInteger
  },
  { sortKey: 'status', label: t('hr.leaveRequests.col.status'), minW: '120px' },
  {
    sortKey: 'submittedAt',
    label: t('hr.leaveRequests.col.submittedAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  {
    sortKey: 'reason',
    label: t('hr.leaveRequests.col.reason'),
    minW: '220px',
    defaultHidden: true
  },
  {
    sortKey: 'decidedAt',
    label: t('hr.leaveRequests.col.decidedAt'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
  },
  {
    sortKey: 'decidedBy',
    label: t('hr.leaveRequests.col.decidedBy'),
    minW: '110px',
    defaultHidden: true
  },
  {
    sortKey: 'decisionComment',
    label: t('hr.leaveRequests.col.decisionComment'),
    minW: '240px',
    defaultHidden: true
  }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'status',
    labelKey: 'hr.leaveRequests.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'leaveRequestStatus'
  },
  {
    field: 'leaveTypeNo',
    labelKey: 'hr.leaveRequests.col.leaveTypeName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'leaveTypes'
  },
  {
    field: 'employeeNo',
    labelKey: 'hr.leaveRequests.col.employeeName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'employees'
  },
  {
    field: 'orgUnitNo',
    labelKey: 'hr.leaveRequests.col.orgUnitNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'orgUnits'
  }
]

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
} = useListPage<LeaveRequestApi, LeaveRequestSearchColumn>({
  tableId: 'hr-leave-requests',
  feature: 'LEAVEREQUEST',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'leave-requests',
  exportApi: leaveRequestApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('hr.leaveRequests.title')"
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
        @update:list-view="store.setListView($event as LeaveRequestListView)"
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
        :loading-text="t('hr.leaveRequests.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('hr.leaveRequests.noResults')"
        :no-search-results-message="
          t('hr.leaveRequests.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as LeaveRequestApi)"
        @row-dblclick="(item) => openFromList((item as LeaveRequestApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <LeaveRequestStatusPill :status="(item as LeaveRequestApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as LeaveRequestListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="font-semibold text-primary">{{ store.selectedItem.employeeName }}</p>
                  <p class="text-muted-foreground">{{ store.selectedItem.leaveTypeName }}</p>
                </div>
                <LeaveRequestStatusPill :status="store.selectedItem.status" />
                <p>
                  {{ formatDate(store.selectedItem.startDate) }} →
                  {{ formatDate(store.selectedItem.endDate) }}
                  · {{ t('hr.leaveRequests.form.dayCount', store.selectedItem.days) }}
                </p>
                <p v-if="store.selectedItem.reason" class="text-muted-foreground">
                  {{ store.selectedItem.reason }}
                </p>
                <p v-if="store.selectedItem.decisionComment" class="bg-muted/50 rounded px-3 py-2">
                  {{ store.selectedItem.decisionComment }}
                </p>
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

    <LeaveRequestCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :request-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <LeaveRequestCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
