<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { usePermissions } from '@/composables/usePermissions'
import { missingDocumentApi } from '../api/documentApi'
import { useMissingDocumentStore } from '../stores/missingDocumentStore'
import type {
  DocumentApi,
  MissingDocumentApi,
  MissingDocumentSearchColumn
} from '../types/document.types'

const { t } = useI18n()
const router = useRouter()
const store = useMissingDocumentStore()
const { canInsert } = usePermissions('DOCUMENT')
const { optionLabel } = useListCellFormatters()

const searchColumnOptions = computed<{ value: MissingDocumentSearchColumn; label: string }[]>(
  () => [
    { value: 'subjectName,documentTypeName', label: t('fleet.missingDocuments.search.all') },
    { value: 'subjectName', label: t('fleet.missingDocuments.col.subjectName') },
    { value: 'documentTypeName', label: t('fleet.missingDocuments.col.documentTypeName') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'subjectName', label: t('fleet.missingDocuments.col.subjectName'), minW: '200px' },
  {
    sortKey: 'target',
    label: t('fleet.missingDocuments.col.target'),
    minW: '120px',
    formatter: optionLabel('documentTarget')
  },
  {
    sortKey: 'documentTypeName',
    label: t('fleet.missingDocuments.col.documentTypeName'),
    minW: '220px'
  },
  {
    sortKey: 'reason',
    label: t('fleet.missingDocuments.col.reason'),
    minW: '130px',
    formatter: optionLabel('complianceGapReason')
  }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'target',
    labelKey: 'fleet.missingDocuments.col.target',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'documentTarget'
  },
  {
    field: 'reason',
    labelKey: 'fleet.missingDocuments.col.reason',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'complianceGapReason'
  }
]

const {
  showFilterPanel,
  appliedFilterCount,
  showDetailsPanel,
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
} = useListPage<MissingDocumentApi, MissingDocumentSearchColumn>({
  tableId: 'fleet-missing-documents',
  feature: 'DOCUMENT',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'missing-documents',
  exportApi: missingDocumentApi.exportExcel,
  hasCard: false
})

const creating = ref<Partial<DocumentApi> | null>(null)

function fill(gap: MissingDocumentApi) {
  creating.value = {
    target: gap.target,
    subjectNo: gap.subjectNo,
    documentTypeNo: gap.documentTypeNo
  }
}

async function onCreated() {
  creating.value = null
  await store.fetchItems(store.pagination.page, store.pagination.limit)
}

function openDocument(no: string) {
  void router.push({ path: '/fleet/documents', query: { no, cardMode: 'view' } })
}

/* These lines have no card: their actions sit in the details panel, opened with the selection. */
function selectAndShow(item: MissingDocumentApi) {
  store.selectItem(item)
  showDetailsPanel.value = true
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.missingDocuments.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-create="false"
        :show-list-view="false"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @toggle-filter="showFilterPanel = !showFilterPanel"
        @toggle-details="showDetailsPanel = !showDetailsPanel"
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

      <p class="mx-4 mt-2 text-xs text-muted-foreground">{{ t('fleet.missingDocuments.hint') }}</p>
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
        :loading-text="t('fleet.missingDocuments.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.missingDocuments.noResults')"
        :no-search-results-message="
          t('fleet.missingDocuments.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => selectAndShow(item as MissingDocumentApi)"
        @row-dblclick="(item) => fill(item as MissingDocumentApi)"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            @update:model-value="onUpdateUserFilters"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.subjectName">
            <template #details>
              <div class="px-4 py-4 space-y-2 flex-1 overflow-y-auto text-sm">
                <p class="font-semibold text-primary">{{ store.selectedItem.documentTypeName }}</p>
                <p class="text-muted-foreground">
                  {{
                    optionLabel('complianceGapReason')(
                      store.selectedItem.reason,
                      store.selectedItem
                    )
                  }}
                </p>
              </div>
            </template>
            <template #footer>
              <button
                v-if="store.selectedItem.documentNo"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                @click="openDocument(store.selectedItem.documentNo)"
              >
                {{ t('fleet.missingDocuments.openDocument') }}
              </button>
              <button
                v-if="canInsert"
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium"
                @click="fill(store.selectedItem)"
              >
                {{ t('fleet.missingDocuments.createDocument') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <DocumentCreateModal
      v-if="creating"
      :initial-data="creating"
      @close="creating = null"
      @created="onCreated"
    />
  </div>
</template>
