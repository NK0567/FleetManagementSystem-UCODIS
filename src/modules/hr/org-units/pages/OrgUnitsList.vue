<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ReferenceImportDialog from '@/modules/hr/reference-import/ReferenceImportDialog.vue'
import { List, ListTree, Network, Upload } from '@lucide/vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { orgUnitApi } from '../api/orgUnitApi'
import { orgUnitService } from '../services/orgUnitService'
import { useOrgUnitStore } from '../stores/orgUnitStore'
import type { OrgUnitApi, OrgUnitSearchColumn } from '../types/orgUnit.types'

const VIEWS = ['list', 'tree', 'chart'] as const
type OrgUnitView = (typeof VIEWS)[number]

const { t } = useI18n()
const importing = ref(false)
const route = useRoute()
const router = useRouter()
const store = useOrgUnitStore()
const { optionLabel, referenceLabel, formatInteger, formatDateTime } = useListCellFormatters()

const view = computed<OrgUnitView>(() => {
  const value = String(route.query.view ?? '')
  return VIEWS.find((candidate) => candidate === value) ?? 'list'
})

const viewOptions = computed(() => [
  { value: 'list', label: t('hr.orgUnits.view.list'), icon: List },
  { value: 'tree', label: t('hr.orgUnits.view.tree'), icon: ListTree },
  { value: 'chart', label: t('hr.orgUnits.view.chart'), icon: Network }
])

function setView(next: string) {
  void router.replace({ query: { ...route.query, view: next === 'list' ? undefined : next } })
}

const searchColumnOptions = computed<{ value: OrgUnitSearchColumn; label: string }[]>(() => [
  { value: 'no,name', label: t('hr.orgUnits.search.all') },
  { value: 'no', label: t('hr.orgUnits.col.no') },
  { value: 'name', label: t('hr.orgUnits.col.name') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('hr.orgUnits.col.no'), minW: '90px', cell: 'link' },
  { sortKey: 'name', label: t('hr.orgUnits.col.name'), minW: '220px' },
  {
    sortKey: 'type',
    label: t('hr.orgUnits.col.type'),
    minW: '110px',
    formatter: optionLabel('orgUnitType')
  },
  { sortKey: 'parentName', label: t('hr.orgUnits.col.parentName'), minW: '200px' },
  { sortKey: 'managerName', label: t('hr.orgUnits.col.managerName'), minW: '180px' },
  {
    sortKey: 'headcount',
    label: t('hr.orgUnits.col.headcount'),
    minW: '100px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'totalHeadcount',
    label: t('hr.orgUnits.col.totalHeadcount'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  { sortKey: 'status', label: t('hr.orgUnits.col.status'), minW: '120px' },
  {
    sortKey: 'siteCode',
    label: t('hr.orgUnits.col.siteCode'),
    minW: '170px',
    defaultHidden: true,
    formatter: referenceLabel('sites')
  },
  {
    sortKey: 'description',
    label: t('hr.orgUnits.col.description'),
    minW: '260px',
    defaultHidden: true
  },
  {
    sortKey: 'validatedAt',
    label: t('hr.orgUnits.col.validatedAt'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTime
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
    field: 'type',
    labelKey: 'hr.orgUnits.col.type',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'orgUnitType'
  },
  {
    field: 'status',
    labelKey: 'hr.orgUnits.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'orgUnitStatus'
  },
  {
    field: 'parentNo',
    labelKey: 'hr.orgUnits.col.parentName',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'orgUnits'
  },
  {
    field: 'siteCode',
    labelKey: 'hr.orgUnits.col.siteCode',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'sites'
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
} = useListPage<OrgUnitApi, OrgUnitSearchColumn>({
  tableId: 'hr-org-units',
  feature: 'ORGUNIT',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'org-units',
  exportApi: orgUnitApi.exportExcel,
  remove: orgUnitService.remove,
  deleteErrorFallback: t('hr.orgUnits.deleteError')
})

/** The tree and the chart reload the structure, which a closed card may have changed. */
function closeUnitCard() {
  closeCard()
  if (view.value !== 'list') void store.fetchStructure()
}

watch(
  view,
  (current) => {
    if (current !== 'list') void store.fetchStructure()
  },
  { immediate: true }
)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('hr.orgUnits.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-details-toggle="view === 'list'"
        :show-filter-toggle="view === 'list'"
        :show-create="canInsert"
        :show-card-actions="showCardActions && view === 'list'"
        :can-view-selected="canViewSelected"
        :can-edit-selected="canEditSelected"
        :show-list-view="false"
        :view-options="viewOptions"
        :view="view"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @update:view="setView"
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
        :error="deleteError ?? exportError ?? store.structureError"
        @clear:error="deleteError = exportError = null"
      />

      <template v-if="view !== 'list'">
        <LoadingSpinner v-if="store.structureLoading" :text="t('hr.orgUnits.loadingList')" />
        <OrgUnitTree
          v-else-if="view === 'tree'"
          :units="store.structure"
          :search-query="store.searchQuery"
          @open="openFromList"
        />
        <OrgChart v-else :units="store.structure" @open="openFromList" />
      </template>

      <ListPageLayout
        v-else
        :filter-panel-open="showFilterPanel"
        :table-columns="visibleColumns"
        :sticky-column-count="stickyColumnCount"
        :resizable="true"
        :reorderable="true"
        :on-reorder-columns="onReorderColumns"
        :sort-by="store.sortBy"
        :sort-direction="store.sortDirection"
        :loading="store.loading"
        :loading-text="t('hr.orgUnits.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('hr.orgUnits.noResults')"
        :no-search-results-message="t('hr.orgUnits.noSearchResults', { query: store.searchQuery })"
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
        @select-item="(item) => store.selectItem(item as OrgUnitApi)"
        @row-dblclick="(item) => openFromList((item as OrgUnitApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <OrgUnitStatusPill :status="(item as OrgUnitApi).status" />
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
                <div>
                  <p class="font-semibold text-primary">{{ store.selectedItem.name }}</p>
                  <p class="text-muted-foreground">{{ store.selectedItem.parentName }}</p>
                </div>
                <p v-if="store.selectedItem.description" class="text-muted-foreground">
                  {{ store.selectedItem.description }}
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <div class="bg-primary text-primary-foreground p-3 rounded text-center">
                    <p class="text-xl font-bold">{{ store.selectedItem.headcount }}</p>
                    <p class="text-xs">{{ t('hr.orgUnits.col.headcount') }}</p>
                  </div>
                  <div class="bg-primary text-primary-foreground p-3 rounded text-center">
                    <p class="text-xl font-bold">{{ store.selectedItem.totalHeadcount }}</p>
                    <p class="text-xs">{{ t('hr.orgUnits.col.totalHeadcount') }}</p>
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
      :title="t('hr.orgUnits.confirmDelete')"
      :message="t('hr.orgUnits.confirmDeleteMsg', { name: itemToDelete?.name })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <ReferenceImportDialog
      :open="importing"
      kind="orgUnits"
      :submit="orgUnitService.importRows"
      @close="importing = false"
      @imported="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
    <OrgUnitCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :unit-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeUnitCard"
      @create="createFromCard"
    />
    <OrgUnitCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
