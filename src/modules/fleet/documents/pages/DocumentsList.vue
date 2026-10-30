<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { documentApi } from '../api/documentApi'
import { useDocumentStore, type DocumentListView } from '../stores/documentStore'
import type { DocumentApi, DocumentSearchColumn } from '../types/document.types'

const { t } = useI18n()
const store = useDocumentStore()
const { formatDateTime, optionLabel, formatDate, formatInteger } = useListCellFormatters()

const listViewOptions = computed<{ value: DocumentListView; label: string }[]>(() => [
  { value: 'toRenew', label: t('fleet.documents.listView.toRenew') },
  { value: 'current', label: t('fleet.documents.listView.current') },
  { value: 'all', label: t('fleet.documents.listView.all') }
])

const searchColumnOptions = computed<{ value: DocumentSearchColumn; label: string }[]>(() => [
  { value: 'no,subjectName,number', label: t('fleet.documents.search.all') },
  { value: 'no', label: t('fleet.documents.col.no') },
  { value: 'subjectName', label: t('fleet.documents.col.subjectName') },
  { value: 'number', label: t('fleet.documents.col.number') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.documents.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'target',
    label: t('fleet.documents.col.target'),
    minW: '120px',
    formatter: optionLabel('documentTarget')
  },
  { sortKey: 'documentTypeName', label: t('fleet.documents.col.documentTypeNo'), minW: '200px' },
  { sortKey: 'number', label: t('fleet.documents.col.number'), minW: '150px' },
  { sortKey: 'detail', label: t('fleet.documents.col.detail'), minW: '140px', defaultHidden: true },
  {
    sortKey: 'issueDate',
    label: t('fleet.documents.col.issueDate'),
    minW: '120px',
    defaultHidden: true,
    formatter: formatDate
  },
  {
    sortKey: 'expiryDate',
    label: t('fleet.documents.col.expiryDate'),
    minW: '130px',
    formatter: formatDate
  },
  { sortKey: 'subjectName', label: t('fleet.documents.col.subjectName'), minW: '200px' },
  {
    sortKey: 'state',
    label: t('fleet.documents.col.state'),
    minW: '120px',
    formatter: optionLabel('documentState')
  },
  {
    sortKey: 'notifyOn',
    label: t('fleet.documents.col.notifyOn'),
    minW: '120px',
    defaultHidden: true,
    formatter: formatDate
  },
  {
    sortKey: 'version',
    label: t('fleet.documents.col.version'),
    minW: '90px',
    align: 'right',
    defaultHidden: true,
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
    field: 'state',
    labelKey: 'fleet.documents.col.state',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'documentState'
  },
  {
    field: 'target',
    labelKey: 'fleet.documents.col.target',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'documentTarget'
  },
  {
    field: 'documentTypeNo',
    labelKey: 'fleet.documents.col.documentTypeNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'documentTypes'
  }
]

const detailKeys = ['subjectName', 'number', 'expiryDate', 'state']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: DocumentApi, column: TableColumn): string {
  return getListCellDisplay(
    (item as unknown as Record<string, unknown>)[column.sortKey],
    item,
    column
  )
}

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
} = useListPage<DocumentApi, DocumentSearchColumn>({
  tableId: 'fleet-documents',
  feature: 'DOCUMENT',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'documents',
  exportApi: documentApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.documents.title')"
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
        @update:list-view="store.setListView($event as DocumentListView)"
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
        :loading-text="t('fleet.documents.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert ? t('fleet.documents.noResultsCreate') : t('fleet.documents.noResults')
        "
        :no-search-results-message="
          t('fleet.documents.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as DocumentApi)"
        @row-dblclick="(item) => openFromList((item as DocumentApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-state="{ item }">
          <DocumentStatePill :state="(item as DocumentApi).state" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as DocumentListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.documents.col.documentTypeName') }}
                  </p>
                  <p class="font-semibold text-primary">
                    {{ store.selectedItem.documentTypeName }}
                  </p>
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
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <DocumentCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :document-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <DocumentCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
