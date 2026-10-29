<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ReferenceImportDialog from '@/modules/hr/reference-import/ReferenceImportDialog.vue'
import { Upload } from '@lucide/vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { employeeCategoryApi } from '../api/employeeCategoryApi'
import { employeeCategoryService } from '../services/employeeCategoryService'
import { useEmployeeCategoryStore } from '../stores/employeeCategoryStore'
import type {
  EmployeeCategoryApi,
  EmployeeCategorySearchColumn
} from '../types/employeeCategory.types'

const { t } = useI18n()
const importing = ref(false)
const store = useEmployeeCategoryStore()
const { booleanLabel, formatInteger, formatDateTime } = useListCellFormatters()

const searchColumnOptions = computed<{ value: EmployeeCategorySearchColumn; label: string }[]>(
  () => [
    { value: 'no,name', label: t('hr.employeeCategories.search.all') },
    { value: 'no', label: t('hr.employeeCategories.col.no') },
    { value: 'name', label: t('hr.employeeCategories.col.name') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('hr.employeeCategories.col.no'), minW: '100px', cell: 'link' },
  { sortKey: 'name', label: t('hr.employeeCategories.col.name'), minW: '200px' },
  {
    sortKey: 'annualLeaveDays',
    label: t('hr.employeeCategories.col.annualLeaveDays'),
    minW: '140px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'employeeCount',
    label: t('hr.employeeCategories.col.employeeCount'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'active',
    label: t('hr.employeeCategories.col.active'),
    minW: '90px',
    formatter: booleanLabel
  },
  {
    sortKey: 'description',
    label: t('hr.employeeCategories.col.description'),
    minW: '240px',
    defaultHidden: true
  },
  {
    sortKey: 'modifiedAt',
    label: t('common.audit.modifiedAt'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
  },
  {
    sortKey: 'modifiedBy',
    label: t('common.audit.modifiedBy'),
    minW: '110px',
    defaultHidden: true
  }
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
} = useListPage<EmployeeCategoryApi, EmployeeCategorySearchColumn>({
  tableId: 'hr-employee-categories',
  feature: 'EMPLOYEECATEGORY',
  store,
  columns: tableColumns,
  exportFileBaseName: 'employee-categories',
  exportApi: employeeCategoryApi.exportExcel,
  remove: employeeCategoryService.remove,
  deleteErrorFallback: t('hr.employeeCategories.deleteError')
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('hr.employeeCategories.title')"
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
        <template v-if="canInsert" #extra-actions>
          <button
            type="button"
            class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
            @click="importing = true"
          >
            <Upload class="w-4 h-4 text-primary" />
            {{ t('hr.referenceImport.action') }}
          </button>
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
        :loading-text="t('hr.employeeCategories.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('hr.employeeCategories.noResults')"
        :no-search-results-message="
          t('hr.employeeCategories.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as EmployeeCategoryApi)"
        @row-dblclick="(item) => openFromList((item as EmployeeCategoryApi).no)"
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
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('hr.employeeCategories.col.name') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.name }}</p>
                  <p v-if="store.selectedItem.description" class="text-muted-foreground mt-1">
                    {{ store.selectedItem.description }}
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="bg-primary text-primary-foreground p-3 rounded text-center">
                    <p class="text-xl font-bold">{{ store.selectedItem.annualLeaveDays }}</p>
                    <p class="text-xs">{{ t('hr.employeeCategories.col.annualLeaveDays') }}</p>
                  </div>
                  <div class="bg-primary text-primary-foreground p-3 rounded text-center">
                    <p class="text-xl font-bold">{{ store.selectedItem.employeeCount }}</p>
                    <p class="text-xs">{{ t('hr.employeeCategories.col.employeeCount') }}</p>
                  </div>
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
      :title="t('hr.employeeCategories.confirmDelete')"
      :message="t('hr.employeeCategories.confirmDeleteMsg', { name: itemToDelete?.name })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <ReferenceImportDialog
      :open="importing"
      kind="employeeCategories"
      :submit="employeeCategoryService.importRows"
      @close="importing = false"
      @imported="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
    <EmployeeCategoryCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :category-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <EmployeeCategoryCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
