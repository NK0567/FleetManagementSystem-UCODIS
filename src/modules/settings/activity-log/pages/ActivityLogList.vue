<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { activityLogApi } from '../api/activityLogApi'
import { useActivityLogStore } from '../stores/activityLogStore'
import type { ActivityLogEntryApi, ActivityLogSearchColumn } from '../types/activityLog.types'

const { t } = useI18n()
const store = useActivityLogStore()
const { formatDateTime } = useListCellFormatters()

const searchColumnOptions = computed<{ value: ActivityLogSearchColumn; label: string }[]>(() => [
  {
    value: 'byName,by,actionLabel,entityLabel,recordNo,detail',
    label: t('settings.activityLog.search.all')
  },
  { value: 'byName', label: t('settings.activityLog.col.byName') },
  { value: 'actionLabel', label: t('settings.activityLog.col.actionLabel') },
  { value: 'entityLabel', label: t('settings.activityLog.col.entityLabel') },
  { value: 'recordNo', label: t('settings.activityLog.col.recordNo') }
])

const tableColumns = computed<TableColumn[]>(() => [
  {
    sortKey: 'at',
    label: t('settings.activityLog.col.at'),
    minW: '150px',
    formatter: formatDateTime
  },
  { sortKey: 'byName', label: t('settings.activityLog.col.byName'), minW: '200px' },
  { sortKey: 'by', label: t('settings.activityLog.col.by'), minW: '100px', defaultHidden: true },
  { sortKey: 'actionLabel', label: t('settings.activityLog.col.actionLabel'), minW: '180px' },
  { sortKey: 'entityLabel', label: t('settings.activityLog.col.entityLabel'), minW: '170px' },
  { sortKey: 'recordNo', label: t('settings.activityLog.col.recordNo'), minW: '130px' },
  { sortKey: 'detail', label: t('settings.activityLog.col.detail'), minW: '280px' }
])

const filterDefs: FilterFieldDef[] = [
  { field: 'by', labelKey: 'settings.activityLog.col.by', valueType: 'string', kind: 'text' },
  {
    field: 'actionLabel',
    labelKey: 'settings.activityLog.col.actionLabel',
    valueType: 'string',
    kind: 'text'
  },
  {
    field: 'entityLabel',
    labelKey: 'settings.activityLog.col.entityLabel',
    valueType: 'string',
    kind: 'text'
  }
]

const {
  showFilterPanel,
  appliedFilterCount,
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
} = useListPage<ActivityLogEntryApi, ActivityLogSearchColumn>({
  tableId: 'settings-activity-log',
  feature: 'ACTIVITYLOG',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'journal-activite',
  exportApi: activityLogApi.exportExcel,
  hasCard: false
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('settings.activityLog.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="false"
        :show-create="false"
        :show-list-view="false"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @toggle-filter="showFilterPanel = !showFilterPanel"
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
        :loading-text="t('settings.activityLog.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('settings.activityLog.noResults')"
        :no-search-results-message="
          t('settings.activityLog.noSearchResults', { query: store.searchQuery })
        "
        :page="store.pagination.page"
        :total-pages="store.pagination.totalPages"
        :total="store.pagination.total"
        :limit="store.pagination.limit"
        :show-details-panel="false"
        @close-filter="showFilterPanel = false"
        @reset-filters="store.resetFilters()"
        @sort="onSort"
        @update:width="setColumnWidth"
        @update:page="store.changePage"
        @update:limit="store.changeLimit"
        @select-item="(item) => store.selectItem(item as ActivityLogEntryApi)"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            @update:model-value="onUpdateUserFilters"
          />
        </template>
      </ListPageLayout>
    </template>
  </div>
</template>
