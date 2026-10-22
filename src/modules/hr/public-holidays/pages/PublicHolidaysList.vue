<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { formatDate } from '@/utils/format'
import { publicHolidayApi } from '../api/publicHolidayApi'
import { publicHolidayService } from '../services/publicHolidayService'
import { usePublicHolidayStore } from '../stores/publicHolidayStore'
import type { PublicHolidayApi, PublicHolidaySearchColumn } from '../types/publicHoliday.types'

const { t } = useI18n()
const store = usePublicHolidayStore()
const { booleanLabel, formatDate: formatDateCell, formatDateTime } = useListCellFormatters()

const searchColumnOptions = computed<{ value: PublicHolidaySearchColumn; label: string }[]>(() => [
  { value: 'name', label: t('hr.publicHolidays.col.name') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('hr.publicHolidays.col.no'), minW: '90px', cell: 'link' },
  {
    sortKey: 'date',
    label: t('hr.publicHolidays.col.date'),
    minW: '120px',
    formatter: formatDateCell
  },
  { sortKey: 'name', label: t('hr.publicHolidays.col.name'), minW: '240px' },
  {
    sortKey: 'recurring',
    label: t('hr.publicHolidays.col.recurring'),
    minW: '140px',
    formatter: booleanLabel
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
} = useListPage<PublicHolidayApi, PublicHolidaySearchColumn>({
  tableId: 'hr-public-holidays',
  feature: 'PUBLICHOLIDAY',
  store,
  columns: tableColumns,
  exportFileBaseName: 'public-holidays',
  exportApi: publicHolidayApi.exportExcel,
  remove: publicHolidayService.remove,
  deleteErrorFallback: t('hr.publicHolidays.deleteError')
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('hr.publicHolidays.title')"
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
        :loading-text="t('hr.publicHolidays.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('hr.publicHolidays.noResults')"
        :no-search-results-message="
          t('hr.publicHolidays.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as PublicHolidayApi)"
        @row-dblclick="(item) => openFromList((item as PublicHolidayApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
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
              <div class="px-4 py-4 space-y-2 flex-1 overflow-y-auto text-sm">
                <p class="font-semibold text-primary">{{ store.selectedItem.name }}</p>
                <p>{{ formatDate(store.selectedItem.date) }}</p>
                <p class="text-muted-foreground">
                  {{
                    store.selectedItem.recurring
                      ? t('hr.publicHolidays.recurringHint')
                      : t('hr.publicHolidays.oneOffHint')
                  }}
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
                v-if="canDelete"
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
      :title="t('hr.publicHolidays.confirmDelete')"
      :message="t('hr.publicHolidays.confirmDeleteMsg', { name: itemToDelete?.name })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <PublicHolidayCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :holiday-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <PublicHolidayCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
