<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RotateCcw } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { downtimeCodeApi } from '../api/downtimeCodeApi'
import { downtimeCodeService } from '../services/downtimeCodeService'
import { useDowntimeCodeStore } from '../stores/downtimeCodeStore'
import type { DowntimeCodeApi, DowntimeCodeSearchColumn } from '../types/downtimeCode.types'

const { t } = useI18n()
const store = useDowntimeCodeStore()
const { canExecute } = usePermissions('DOWNTIMECODE')
const confirmingReset = ref(false)
const resetting = ref(false)
const resetError = ref<string | null>(null)

async function resetCodes() {
  resetting.value = true
  resetError.value = null
  try {
    await downtimeCodeApi.reset()
    confirmingReset.value = false
    await store.fetchItems(1, store.pagination.limit)
  } catch (cause) {
    resetError.value = apiErrorMessage(cause, t('maintenance.downtimeCodes.resetError'))
    confirmingReset.value = false
  } finally {
    resetting.value = false
  }
}
const { formatDateTime, optionLabel, booleanLabel } = useListCellFormatters()

const searchColumnOptions = computed<{ value: DowntimeCodeSearchColumn; label: string }[]>(() => [
  { value: 'no,name', label: t('maintenance.downtimeCodes.search.all') },
  { value: 'no', label: t('maintenance.downtimeCodes.col.no') },
  { value: 'name', label: t('maintenance.downtimeCodes.col.name') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('maintenance.downtimeCodes.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'name', label: t('maintenance.downtimeCodes.col.name'), minW: '240px' },
  {
    sortKey: 'family',
    label: t('maintenance.downtimeCodes.col.family'),
    minW: '140px',
    formatter: optionLabel('downtimeFamily')
  },
  {
    sortKey: 'systemRole',
    label: t('maintenance.downtimeCodes.col.systemRole'),
    minW: '150px',
    formatter: optionLabel('downtimeRole')
  },
  {
    sortKey: 'active',
    label: t('maintenance.downtimeCodes.col.active'),
    minW: '90px',
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
    field: 'family',
    labelKey: 'maintenance.downtimeCodes.col.family',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'downtimeFamily'
  },
  {
    field: 'systemRole',
    labelKey: 'maintenance.downtimeCodes.col.systemRole',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'downtimeRole'
  }
]

const detailKeys = ['family', 'systemRole']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: DowntimeCodeApi, column: TableColumn): string {
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
} = useListPage<DowntimeCodeApi, DowntimeCodeSearchColumn>({
  tableId: 'maintenance-downtime-codes',
  feature: 'DOWNTIMECODE',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'downtime-codes',
  exportApi: downtimeCodeApi.exportExcel,
  remove: downtimeCodeService.remove,
  deleteErrorFallback: t('maintenance.downtimeCodes.deleteError')
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.downtimeCodes.title')"
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
        <template v-if="canExecute" #extra-actions>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
            @click="confirmingReset = true"
          >
            <RotateCcw class="w-4 h-4 text-primary" />
            {{ t('maintenance.downtimeCodes.reset') }}
          </button>
        </template>
      </ListPageToolbar>

      <FormAlerts
        class="mx-4"
        :error="resetError ?? deleteError ?? exportError"
        @clear:error="resetError = deleteError = exportError = null"
      />
      <ConfirmDialog
        :open="confirmingReset"
        :title="t('maintenance.downtimeCodes.reset')"
        :message="t('maintenance.downtimeCodes.resetConfirm')"
        :confirm-label="t('maintenance.downtimeCodes.reset')"
        destructive
        :loading="resetting"
        @confirm="resetCodes"
        @cancel="confirmingReset = false"
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
        :loading-text="t('maintenance.downtimeCodes.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('maintenance.downtimeCodes.noResults')"
        :no-search-results-message="
          t('maintenance.downtimeCodes.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as DowntimeCodeApi)"
        @row-dblclick="(item) => openFromList((item as DowntimeCodeApi).no)"
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
                    {{ t('maintenance.downtimeCodes.col.name') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.name }}</p>
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
      :title="t('maintenance.downtimeCodes.confirmDelete')"
      :message="t('maintenance.downtimeCodes.confirmDeleteMsg', { name: itemToDelete?.name })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <DowntimeCodeCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :downtime-code-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <DowntimeCodeCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
