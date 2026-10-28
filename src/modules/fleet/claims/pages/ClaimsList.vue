<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { claimApi } from '../api/claimApi'
import { useClaimStore, type ClaimListView } from '../stores/claimStore'
import type { ClaimApi, ClaimSearchColumn } from '../types/claim.types'

const { t } = useI18n()
const store = useClaimStore()
const { formatDateTime, optionLabel, formatInteger } = useListCellFormatters()

const listViewOptions = computed<{ value: ClaimListView; label: string }[]>(() => [
  { value: 'open', label: t('fleet.claims.listView.open') },
  { value: 'closed', label: t('fleet.claims.listView.closed') },
  { value: 'all', label: t('fleet.claims.listView.all') }
])

const searchColumnOptions = computed<{ value: ClaimSearchColumn; label: string }[]>(() => [
  { value: 'no,vehiclePlate,driverName,location', label: t('fleet.claims.search.all') },
  { value: 'no', label: t('fleet.claims.col.no') },
  { value: 'vehiclePlate', label: t('fleet.claims.col.vehiclePlate') },
  { value: 'driverName', label: t('fleet.claims.col.driverName') },
  { value: 'location', label: t('fleet.claims.col.location') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.claims.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'nature',
    label: t('fleet.claims.col.nature'),
    minW: '110px',
    formatter: optionLabel('claimNature')
  },
  {
    sortKey: 'occurredAt',
    label: t('fleet.claims.col.occurredAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  { sortKey: 'location', label: t('fleet.claims.col.location'), minW: '180px' },
  {
    sortKey: 'severity',
    label: t('fleet.claims.col.severity'),
    minW: '150px',
    formatter: optionLabel('claimSeverity')
  },
  {
    sortKey: 'damageAmount',
    label: t('fleet.claims.col.damageAmount'),
    minW: '130px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'liability',
    label: t('fleet.claims.col.liability'),
    minW: '140px',
    defaultHidden: true,
    formatter: optionLabel('claimLiability')
  },
  { sortKey: 'vehiclePlate', label: t('fleet.claims.col.vehiclePlate'), minW: '120px' },
  { sortKey: 'driverName', label: t('fleet.claims.col.driverName'), minW: '170px' },
  {
    sortKey: 'insuranceStatus',
    label: t('fleet.claims.col.insuranceStatus'),
    minW: '130px',
    formatter: optionLabel('claimInsuranceStatus')
  },
  {
    sortKey: 'indemnityAmount',
    label: t('fleet.claims.col.indemnityAmount'),
    minW: '110px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'residualCost',
    label: t('fleet.claims.col.residualCost'),
    minW: '130px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'status',
    label: t('fleet.claims.col.status'),
    minW: '100px',
    formatter: optionLabel('claimStatus')
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
    labelKey: 'fleet.claims.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'claimStatus'
  },
  {
    field: 'insuranceStatus',
    labelKey: 'fleet.claims.col.insuranceStatus',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'claimInsuranceStatus'
  },
  {
    field: 'nature',
    labelKey: 'fleet.claims.col.nature',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'claimNature'
  },
  {
    field: 'severity',
    labelKey: 'fleet.claims.col.severity',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'claimSeverity'
  },
  {
    field: 'liability',
    labelKey: 'fleet.claims.col.liability',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'claimLiability'
  }
]

const detailKeys = ['vehiclePlate', 'driverName', 'location', 'status']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: ClaimApi, column: TableColumn): string {
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
} = useListPage<ClaimApi, ClaimSearchColumn>({
  tableId: 'fleet-claims',
  feature: 'CLAIM',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'claims',
  exportApi: claimApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.claims.title')"
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
        @update:list-view="store.setListView($event as ClaimListView)"
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
        :loading-text="t('fleet.claims.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.claims.noResults')"
        :no-search-results-message="t('fleet.claims.noSearchResults', { query: store.searchQuery })"
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
        @select-item="(item) => store.selectItem(item as ClaimApi)"
        @row-dblclick="(item) => openFromList((item as ClaimApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #cell-insuranceStatus="{ item }">
          <ClaimInsurancePill :status="(item as ClaimApi).insuranceStatus" />
        </template>
        <template #cell-status="{ item }">
          <ClaimStatusPill :status="(item as ClaimApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as ClaimListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('fleet.claims.col.vehiclePlate') }}
                  </p>
                  <p class="font-semibold text-primary">{{ store.selectedItem.vehiclePlate }}</p>
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

    <ClaimCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :claim-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <ClaimCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
