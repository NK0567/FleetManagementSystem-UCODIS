<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ReferenceImportDialog from '@/modules/hr/reference-import/ReferenceImportDialog.vue'
import { Upload } from '@lucide/vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { MoreAction } from '@/components/shared/MoreActionsMenu.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { jobPositionApi } from '../api/jobPositionApi'
import { jobPositionService } from '../services/jobPositionService'
import { useJobPositionStore } from '../stores/jobPositionStore'
import type { JobPositionApi, JobPositionSearchColumn } from '../types/jobPosition.types'

const { t } = useI18n()
const importing = ref(false)
const store = useJobPositionStore()
const { booleanLabel, formatInteger, formatDateTime, referenceLabel } = useListCellFormatters()

const searchColumnOptions = computed<{ value: JobPositionSearchColumn; label: string }[]>(() => [
  { value: 'no,name', label: t('hr.jobPositions.search.all') },
  { value: 'no', label: t('hr.jobPositions.col.no') },
  { value: 'name', label: t('hr.jobPositions.col.name') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('hr.jobPositions.col.no'), minW: '90px', cell: 'link' },
  { sortKey: 'name', label: t('hr.jobPositions.col.name'), minW: '220px' },
  { sortKey: 'orgUnitName', label: t('hr.jobPositions.col.orgUnitName'), minW: '200px' },
  {
    sortKey: 'plannedHeadcount',
    label: t('hr.jobPositions.col.plannedHeadcount'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'actualHeadcount',
    label: t('hr.jobPositions.col.actualHeadcount'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'headcountGap',
    label: t('hr.jobPositions.col.headcountGap'),
    minW: '90px',
    align: 'right',
    formatter: formatInteger,
    cellClass: (value) => (Number(value) > 0 ? 'text-destructive font-medium' : '')
  },
  {
    sortKey: 'drives',
    label: t('hr.jobPositions.col.drives'),
    minW: '90px',
    formatter: booleanLabel
  },
  {
    sortKey: 'defaultCategoryNo',
    label: t('hr.jobPositions.col.defaultCategoryNo'),
    minW: '160px',
    defaultHidden: true,
    formatter: referenceLabel('employeeCategories')
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
    field: 'orgUnitNo',
    labelKey: 'hr.jobPositions.col.orgUnitName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'orgUnits'
  },
  {
    field: 'defaultCategoryNo',
    labelKey: 'hr.jobPositions.col.defaultCategoryNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'employeeCategories'
  }
]

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
} = useListPage<JobPositionApi, JobPositionSearchColumn>({
  tableId: 'hr-job-positions',
  feature: 'JOBPOSITION',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'job-positions',
  exportApi: jobPositionApi.exportExcel,
  remove: jobPositionService.remove,
  deleteErrorFallback: t('hr.jobPositions.deleteError')
})

/** Secondary gestures of the list, behind « Plus d'actions ». */
const moreActions = computed<MoreAction[]>(() => [
  {
    key: 'import',
    label: t('hr.referenceImport.action'),
    icon: Upload,
    hidden: !canInsert.value,
    onSelect: () => (importing.value = true)
  }
])
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :more-actions="moreActions"
        :title="t('hr.jobPositions.title')"
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
        :loading-text="t('hr.jobPositions.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('hr.jobPositions.noResultsCreate') : t('hr.jobPositions.noResults')
        "
        :no-search-results-message="
          t('hr.jobPositions.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as JobPositionApi)"
        @row-dblclick="(item) => openFromList((item as JobPositionApi).no)"
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
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="font-semibold text-primary">{{ store.selectedItem.name }}</p>
                  <p class="text-muted-foreground">{{ store.selectedItem.orgUnitName }}</p>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div class="bg-primary text-primary-foreground p-3 rounded text-center">
                    <p class="text-xl font-bold">{{ store.selectedItem.plannedHeadcount }}</p>
                    <p class="text-xs">{{ t('hr.jobPositions.col.plannedHeadcount') }}</p>
                  </div>
                  <div class="bg-primary text-primary-foreground p-3 rounded text-center">
                    <p class="text-xl font-bold">{{ store.selectedItem.actualHeadcount }}</p>
                    <p class="text-xs">{{ t('hr.jobPositions.col.actualHeadcount') }}</p>
                  </div>
                  <div class="bg-primary text-primary-foreground p-3 rounded text-center">
                    <p class="text-xl font-bold">{{ store.selectedItem.headcountGap }}</p>
                    <p class="text-xs">{{ t('hr.jobPositions.col.headcountGap') }}</p>
                  </div>
                </div>
                <div v-if="store.selectedItem.responsibilities.length">
                  <p class="text-xs font-semibold text-card-foreground uppercase mb-2">
                    {{ t('hr.jobPositions.form.responsibilities') }}
                  </p>
                  <ul class="list-disc pl-4 space-y-1">
                    <li v-for="line in store.selectedItem.responsibilities" :key="line">
                      {{ line }}
                    </li>
                  </ul>
                </div>
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
      :title="t('hr.jobPositions.confirmDelete')"
      :message="t('hr.jobPositions.confirmDeleteMsg', { name: itemToDelete?.name })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <ReferenceImportDialog
      :open="importing"
      kind="jobPositions"
      :submit="jobPositionService.importRows"
      @close="importing = false"
      @imported="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
    <JobPositionCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :position-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <JobPositionCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
