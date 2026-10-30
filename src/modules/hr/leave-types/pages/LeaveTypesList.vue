<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { leaveTypeApi } from '../api/leaveTypeApi'
import { leaveTypeService } from '../services/leaveTypeService'
import { useLeaveTypeStore } from '../stores/leaveTypeStore'
import type { LeaveTypeApi, LeaveTypeSearchColumn } from '../types/leaveType.types'

const { t } = useI18n()
const store = useLeaveTypeStore()
const { booleanLabel, formatInteger, formatDecimal, formatDateTime } = useListCellFormatters()

const searchColumnOptions = computed<{ value: LeaveTypeSearchColumn; label: string }[]>(() => [
  { value: 'no,name', label: t('hr.leaveTypes.search.all') },
  { value: 'no', label: t('hr.leaveTypes.col.no') },
  { value: 'name', label: t('hr.leaveTypes.col.name') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('hr.leaveTypes.col.no'), minW: '90px', cell: 'link' },
  { sortKey: 'name', label: t('hr.leaveTypes.col.name'), minW: '200px' },
  {
    sortKey: 'annualEntitlementDays',
    label: t('hr.leaveTypes.col.annualEntitlementDays'),
    minW: '130px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'noticeDays',
    label: t('hr.leaveTypes.col.noticeDays'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  { sortKey: 'paid', label: t('hr.leaveTypes.col.paid'), minW: '90px', formatter: booleanLabel },
  {
    sortKey: 'tracksBalance',
    label: t('hr.leaveTypes.col.tracksBalance'),
    minW: '120px',
    formatter: booleanLabel
  },
  {
    sortKey: 'statutory',
    label: t('hr.leaveTypes.col.statutory'),
    minW: '100px',
    formatter: booleanLabel
  },
  {
    sortKey: 'active',
    label: t('hr.leaveTypes.col.active'),
    minW: '80px',
    formatter: booleanLabel
  },
  {
    sortKey: 'monthlyAccrualDays',
    label: t('hr.leaveTypes.col.monthlyAccrualDays'),
    minW: '130px',
    align: 'right',
    defaultHidden: true,
    formatter: formatDecimal
  },
  {
    sortKey: 'maxCarryOverDays',
    label: t('hr.leaveTypes.col.maxCarryOverDays'),
    minW: '130px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'requiresDocument',
    label: t('hr.leaveTypes.col.requiresDocument'),
    minW: '130px',
    defaultHidden: true,
    formatter: booleanLabel
  },
  { sortKey: 'comment', label: t('hr.leaveTypes.col.comment'), minW: '220px', defaultHidden: true },
  {
    sortKey: 'modifiedAt',
    label: t('common.audit.modifiedAt'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
  },
  { sortKey: 'modifiedBy', label: t('common.audit.modifiedBy'), minW: '110px', defaultHidden: true }
])

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
} = useListPage<LeaveTypeApi, LeaveTypeSearchColumn>({
  tableId: 'hr-leave-types',
  feature: 'LEAVETYPE',
  store,
  columns: tableColumns,
  exportFileBaseName: 'leave-types',
  exportApi: leaveTypeApi.exportExcel,
  remove: leaveTypeService.remove,
  deleteErrorFallback: t('hr.leaveTypes.deleteError')
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('hr.leaveTypes.title')"
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
        :show-list-view="false"
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
        :loading-text="t('hr.leaveTypes.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('hr.leaveTypes.noResultsCreate') : t('hr.leaveTypes.noResults')
        "
        :no-search-results-message="
          t('hr.leaveTypes.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as LeaveTypeApi)"
        @row-dblclick="(item) => openFromList((item as LeaveTypeApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-name="{ item, value }">
          <span class="flex items-center gap-2 min-w-0">
            <span
              class="inline-block w-3 h-3 rounded-full shrink-0"
              :style="{ backgroundColor: (item as LeaveTypeApi).color }"
            ></span>
            <span class="truncate">{{ value }}</span>
          </span>
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            @update:model-value="onUpdateUserFilters"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: store.selectedItem.color }"
                  ></span>
                  <p class="font-semibold text-primary">{{ store.selectedItem.name }}</p>
                </div>
                <p v-if="store.selectedItem.comment" class="text-muted-foreground">
                  {{ store.selectedItem.comment }}
                </p>
                <p v-if="store.selectedItem.statutory" class="text-muted-foreground">
                  {{ t('hr.leaveTypes.statutoryHint') }}
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
              <button
                v-if="canDelete && !store.selectedItem.statutory"
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
      :title="t('hr.leaveTypes.confirmDelete')"
      :message="t('hr.leaveTypes.confirmDeleteMsg', { name: itemToDelete?.name })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <LeaveTypeCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :leave-type-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <LeaveTypeCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
