<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { medicalFollowUpApi } from '../api/medicalFollowUpApi'
import {
  useMedicalFollowUpStore,
  type MedicalFollowUpListView
} from '../stores/medicalFollowUpStore'
import type {
  MedicalFollowUpApi,
  MedicalFollowUpSearchColumn
} from '../types/medicalFollowUp.types'

const { t } = useI18n()
const store = useMedicalFollowUpStore()
const { formatDate, formatDateTime, formatInteger, optionLabel } = useListCellFormatters()

const listViewOptions = computed<{ value: MedicalFollowUpListView; label: string }[]>(() => [
  { value: 'attention', label: t('fleet.medicalFollowUps.listView.attention') },
  { value: 'compliant', label: t('fleet.medicalFollowUps.listView.compliant') },
  { value: 'all', label: t('fleet.medicalFollowUps.listView.all') }
])

const searchColumnOptions = computed<{ value: MedicalFollowUpSearchColumn; label: string }[]>(
  () => [
    { value: 'no,employeeName,provider', label: t('fleet.medicalFollowUps.search.all') },
    { value: 'no', label: t('fleet.medicalFollowUps.col.no') },
    { value: 'employeeName', label: t('fleet.medicalFollowUps.col.employeeName') },
    { value: 'provider', label: t('fleet.medicalFollowUps.col.provider') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.medicalFollowUps.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'employeeName', label: t('fleet.medicalFollowUps.col.employeeName'), minW: '180px' },
  {
    sortKey: 'kind',
    label: t('fleet.medicalFollowUps.col.kind'),
    minW: '190px',
    formatter: optionLabel('medicalFollowUpKind')
  },
  {
    sortKey: 'doneOn',
    label: t('fleet.medicalFollowUps.col.doneOn'),
    minW: '120px',
    formatter: formatDate
  },
  {
    sortKey: 'result',
    label: t('fleet.medicalFollowUps.col.result'),
    minW: '190px',
    formatter: optionLabel('medicalFollowUpResult')
  },
  {
    sortKey: 'nextDueOn',
    label: t('fleet.medicalFollowUps.col.nextDueOn'),
    minW: '130px',
    formatter: formatDate
  },
  {
    sortKey: 'status',
    label: t('fleet.medicalFollowUps.col.status'),
    minW: '140px',
    formatter: optionLabel('medicalFollowUpStatus')
  },
  {
    sortKey: 'provider',
    label: t('fleet.medicalFollowUps.col.provider'),
    minW: '180px',
    defaultHidden: true
  },
  {
    sortKey: 'lostDays',
    label: t('fleet.medicalFollowUps.col.lostDays'),
    minW: '110px',
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
    field: 'status',
    labelKey: 'fleet.medicalFollowUps.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'medicalFollowUpStatus'
  },
  {
    field: 'kind',
    labelKey: 'fleet.medicalFollowUps.col.kind',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'medicalFollowUpKind'
  },
  {
    field: 'result',
    labelKey: 'fleet.medicalFollowUps.col.result',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'medicalFollowUpResult'
  }
]

const detailKeys = ['kind', 'doneOn', 'result', 'nextDueOn', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: MedicalFollowUpApi, column: TableColumn): string {
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
} = useListPage<MedicalFollowUpApi, MedicalFollowUpSearchColumn>({
  tableId: 'fleet-medical-follow-ups',
  feature: 'MEDICALFOLLOWUP',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'medical-follow-ups',
  exportApi: medicalFollowUpApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.medicalFollowUps.title')"
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
        @update:list-view="store.setListView($event as MedicalFollowUpListView)"
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
        :loading-text="t('fleet.medicalFollowUps.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          canInsert
            ? t('fleet.medicalFollowUps.noResultsCreate')
            : t('fleet.medicalFollowUps.noResults')
        "
        :no-search-results-message="
          t('fleet.medicalFollowUps.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as MedicalFollowUpApi)"
        @row-dblclick="(item) => openFromList((item as MedicalFollowUpApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-status="{ item }">
          <MedicalFollowUpStatusPill :status="(item as MedicalFollowUpApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as MedicalFollowUpListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.medicalFollowUps.col.employeeName') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.employeeName }}</p>
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

    <MedicalFollowUpCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :item-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <MedicalFollowUpCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
