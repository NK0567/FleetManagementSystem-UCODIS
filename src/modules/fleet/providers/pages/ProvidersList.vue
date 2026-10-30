<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw, Upload } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { MoreAction } from '@/components/shared/MoreActionsMenu.vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { providerApi } from '../api/providerApi'
import ProviderImportDialog from '../components/ProviderImportDialog.vue'
import { providerService } from '../services/providerService'
import { useProviderStore } from '../stores/providerStore'
import type { ProviderApi, ProviderSearchColumn } from '../types/provider.types'

const { t } = useI18n()
const store = useProviderStore()
const { formatDateTime, booleanLabel, formatInteger } = useListCellFormatters()

const searchColumnOptions = computed<{ value: ProviderSearchColumn; label: string }[]>(() => [
  { value: 'no,name,contactName', label: t('fleet.providers.search.all') },
  { value: 'no', label: t('fleet.providers.col.no') },
  { value: 'name', label: t('fleet.providers.col.name') },
  { value: 'contactName', label: t('fleet.providers.col.contactName') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.providers.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'name', label: t('fleet.providers.col.name'), minW: '240px' },
  {
    sortKey: 'providerTypeName',
    label: t('fleet.providers.col.providerType'),
    minW: '170px'
  },
  {
    sortKey: 'source',
    label: t('fleet.providers.col.source'),
    minW: '150px',
    defaultHidden: true,
    formatter: (value) => t(`fleet.providers.source.${String(value)}`)
  },
  { sortKey: 'contactName', label: t('fleet.providers.col.contactName'), minW: '160px' },
  { sortKey: 'phone', label: t('fleet.providers.col.phone'), minW: '130px' },
  { sortKey: 'email', label: t('fleet.providers.col.email'), minW: '200px', defaultHidden: true },
  {
    sortKey: 'address',
    label: t('fleet.providers.col.address'),
    minW: '220px',
    defaultHidden: true
  },
  {
    sortKey: 'authorized',
    label: t('fleet.providers.col.authorized'),
    minW: '100px',
    formatter: booleanLabel
  },
  {
    sortKey: 'activeContractCount',
    label: t('fleet.providers.col.activeContractCount'),
    minW: '140px',
    align: 'right',
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
    field: 'providerType',
    labelKey: 'fleet.providers.col.providerType',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'providerTypes'
  },
  {
    field: 'authorized',
    labelKey: 'fleet.providers.col.authorized',
    valueType: 'boolean',
    kind: 'boolean'
  }
]

const detailKeys = ['providerTypeName', 'contactName', 'phone', 'activeContractCount']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: ProviderApi, column: TableColumn): string {
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
} = useListPage<ProviderApi, ProviderSearchColumn>({
  tableId: 'fleet-providers',
  feature: 'PROVIDER',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'providers',
  exportApi: providerApi.exportExcel,
  remove: providerService.remove,
  deleteErrorFallback: t('fleet.providers.deleteError')
})

const importing = ref(false)
const syncing = ref(false)
const syncError = ref<string | null>(null)
const syncMessage = ref<string | null>(null)

/** Takes the third parties of the management system (simulated) and says what changed. */
/** Bringing in providers from elsewhere is occasional: it waits in « Plus d'actions ». */
const moreActions = computed<MoreAction[]>(() => [
  {
    key: 'sync',
    label: t('fleet.providers.sync.action'),
    icon: RefreshCw,
    hidden: !canInsert.value,
    disabled: syncing.value,
    title: t('fleet.providers.sync.hint'),
    onSelect: () => void synchronize()
  },
  {
    key: 'import',
    label: t('fleet.providers.import.action'),
    icon: Upload,
    hidden: !canInsert.value,
    onSelect: () => (importing.value = true)
  }
])

async function synchronize() {
  syncing.value = true
  syncError.value = null
  syncMessage.value = null
  try {
    const report = await providerService.synchronize()
    syncMessage.value = t('fleet.providers.sync.done', {
      created: report.created.length,
      updated: report.updated.length,
      unchanged: report.unchanged,
      skipped: report.skipped.length
    })
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (cause) {
    syncError.value = apiErrorMessage(cause, t('fleet.providers.sync.error'))
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.providers.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :more-actions="moreActions"
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
        :loading-text="t('fleet.providers.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('fleet.providers.noResultsCreate') : t('fleet.providers.noResults')
        "
        :no-search-results-message="
          t('fleet.providers.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as ProviderApi)"
        @row-dblclick="(item) => openFromList((item as ProviderApi).no)"
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
                    {{ t('fleet.providers.col.name') }}
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
      :title="t('fleet.providers.confirmDelete')"
      :message="t('fleet.providers.confirmDeleteMsg', { name: itemToDelete?.name })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <ProviderCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :provider-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <ProviderCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
    <ProviderImportDialog
      :open="importing"
      @close="importing = false"
      @imported="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
  </div>
</template>
