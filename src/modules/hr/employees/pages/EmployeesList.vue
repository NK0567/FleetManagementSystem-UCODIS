<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw, Upload } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { MoreAction } from '@/components/shared/MoreActionsMenu.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { EMPTY_CELL, formatDate } from '@/utils/format'
import { employeeApi } from '../api/employeeApi'
import { useEmployeeStore, type EmployeeListView } from '../stores/employeeStore'
import type { EmployeeApi, EmployeeSearchColumn } from '../types/employee.types'
import EmployeeImportDialog from '../components/EmployeeImportDialog.vue'
import { employeeService } from '../services/employeeService'

const { t } = useI18n()
const store = useEmployeeStore()
const {
  booleanLabel,
  optionLabel,
  referenceLabel,
  formatDate: formatDateCell,
  formatDateTime
} = useListCellFormatters()

const listViewOptions = computed<{ value: EmployeeListView; label: string }[]>(() => [
  { value: 'onStaff', label: t('hr.employees.listView.onStaff') },
  { value: 'left', label: t('hr.employees.listView.left') },
  { value: 'all', label: t('hr.employees.listView.all') }
])

const searchColumnOptions = computed<{ value: EmployeeSearchColumn; label: string }[]>(() => [
  { value: 'no,fullName,nationalId,phone', label: t('hr.employees.search.all') },
  { value: 'no', label: t('hr.employees.col.no') },
  { value: 'fullName', label: t('hr.employees.col.fullName') },
  { value: 'nationalId', label: t('hr.employees.col.nationalId') },
  { value: 'phone', label: t('hr.employees.col.phone') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('hr.employees.col.no'), minW: '100px', cell: 'link' },
  { sortKey: 'fullName', label: t('hr.employees.col.fullName'), minW: '200px' },
  { sortKey: 'jobPositionName', label: t('hr.employees.col.jobPositionName'), minW: '180px' },
  { sortKey: 'orgUnitName', label: t('hr.employees.col.orgUnitName'), minW: '180px' },
  { sortKey: 'phone', label: t('hr.employees.col.phone'), minW: '130px' },
  { sortKey: 'status', label: t('hr.employees.col.status'), minW: '120px' },
  {
    sortKey: 'contractType',
    label: t('hr.employees.col.contractType'),
    minW: '90px',
    formatter: optionLabel('contractType')
  },
  {
    sortKey: 'hireDate',
    label: t('hr.employees.col.hireDate'),
    minW: '120px',
    formatter: formatDateCell
  },
  {
    sortKey: 'drivingAuthorized',
    label: t('hr.employees.col.drivingAuthorized'),
    minW: '110px',
    formatter: (value, item) =>
      (item as EmployeeApi).drives ? booleanLabel(value, item) : EMPTY_CELL
  },
  {
    sortKey: 'categoryName',
    label: t('hr.employees.col.categoryName'),
    minW: '160px',
    defaultHidden: true
  },
  {
    sortKey: 'siteCode',
    label: t('hr.employees.col.siteCode'),
    minW: '170px',
    defaultHidden: true,
    formatter: referenceLabel('sites')
  },
  {
    sortKey: 'nationalId',
    label: t('hr.employees.col.nationalId'),
    minW: '150px',
    defaultHidden: true
  },
  { sortKey: 'email', label: t('hr.employees.col.email'), minW: '200px', defaultHidden: true },
  {
    sortKey: 'birthDate',
    label: t('hr.employees.col.birthDate'),
    minW: '120px',
    defaultHidden: true,
    formatter: formatDateCell
  },
  {
    sortKey: 'gender',
    label: t('hr.employees.col.gender'),
    minW: '90px',
    defaultHidden: true,
    formatter: optionLabel('gender')
  },
  {
    sortKey: 'maritalStatus',
    label: t('hr.employees.col.maritalStatus'),
    minW: '130px',
    defaultHidden: true,
    formatter: optionLabel('maritalStatus')
  },
  {
    sortKey: 'exitDate',
    label: t('hr.employees.col.exitDate'),
    minW: '120px',
    defaultHidden: true,
    formatter: formatDateCell
  },
  {
    sortKey: 'hasSystemAccount',
    label: t('hr.employees.col.hasSystemAccount'),
    minW: '130px',
    defaultHidden: true,
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

const filterDefs: FilterFieldDef[] = [
  {
    field: 'status',
    labelKey: 'hr.employees.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'employeeStatus'
  },
  {
    field: 'contractType',
    labelKey: 'hr.employees.col.contractType',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'contractType'
  },
  {
    field: 'gender',
    labelKey: 'hr.employees.col.gender',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'gender'
  },
  {
    field: 'maritalStatus',
    labelKey: 'hr.employees.col.maritalStatus',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'maritalStatus'
  },
  {
    field: 'orgUnitNo',
    labelKey: 'hr.employees.col.orgUnitName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'orgUnits'
  },
  {
    field: 'jobPositionNo',
    labelKey: 'hr.employees.col.jobPositionName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'jobPositions'
  },
  {
    field: 'categoryNo',
    labelKey: 'hr.employees.col.categoryName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'employeeCategories'
  },
  {
    field: 'siteCode',
    labelKey: 'hr.employees.col.siteCode',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'sites'
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
} = useListPage<EmployeeApi, EmployeeSearchColumn>({
  tableId: 'hr-employees',
  feature: 'EMPLOYEE',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'employees',
  exportApi: employeeApi.exportExcel
})

const importing = ref(false)
const syncing = ref(false)
const syncError = ref<string | null>(null)
const syncMessage = ref<string | null>(null)

/** Takes the people of the HR system (simulated in the mock-up) and says what changed. */
async function synchronize() {
  syncing.value = true
  syncError.value = null
  syncMessage.value = null
  try {
    const report = await employeeService.synchronize()
    syncMessage.value = t('hr.employees.sync.done', {
      created: report.created.length,
      updated: report.updated.length,
      unchanged: report.unchanged,
      skipped: report.skipped.length
    })
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (cause) {
    syncError.value = apiErrorMessage(cause, t('hr.employees.sync.error'))
  } finally {
    syncing.value = false
  }
}

/** Secondary gestures of the list, behind « Plus d'actions ». */
const moreActions = computed<MoreAction[]>(() => [
  {
    key: 'import',
    label: t('hr.employees.import.action'),
    icon: Upload,
    hidden: !canInsert.value,
    onSelect: () => (importing.value = true)
  },
  {
    key: 'sync',
    label: t('hr.employees.sync.action'),
    icon: RefreshCw,
    hidden: !canInsert.value,
    disabled: syncing.value,
    title: t('hr.employees.sync.hint'),
    onSelect: () => void synchronize()
  }
])
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :more-actions="moreActions"
        :title="t('hr.employees.title')"
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
        @update:list-view="store.setListView($event as EmployeeListView)"
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
      <FormAlerts
        class="mx-4"
        :error="syncError"
        :success="syncMessage"
        @clear:error="syncError = null"
        @clear:success="syncMessage = null"
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
        :loading-text="t('hr.employees.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('hr.employees.noResultsCreate') : t('hr.employees.noResults')
        "
        :no-search-results-message="t('hr.employees.noSearchResults', { query: store.searchQuery })"
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
        @select-item="(item) => store.selectItem(item as EmployeeApi)"
        @row-dblclick="(item) => openFromList((item as EmployeeApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <EmployeeStatusPill :status="(item as EmployeeApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as EmployeeListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="font-semibold text-primary">{{ store.selectedItem.fullName }}</p>
                  <p class="text-muted-foreground">
                    {{ store.selectedItem.jobPositionName }} · {{ store.selectedItem.orgUnitName }}
                  </p>
                </div>
                <EmployeeStatusPill :status="store.selectedItem.status" />
                <div class="space-y-2">
                  <p>
                    <span class="text-muted-foreground">{{ t('hr.employees.col.phone') }} : </span>
                    {{ store.selectedItem.phone }}
                  </p>
                  <p v-if="store.selectedItem.email">
                    <span class="text-muted-foreground">{{ t('hr.employees.col.email') }} : </span>
                    {{ store.selectedItem.email }}
                  </p>
                  <p>
                    <span class="text-muted-foreground"
                      >{{ t('hr.employees.col.hireDate') }} :
                    </span>
                    {{ formatDate(store.selectedItem.hireDate) }}
                  </p>
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
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <EmployeeImportDialog
      :open="importing"
      @close="importing = false"
      @imported="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
    <EmployeeCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :employee-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <EmployeeCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
