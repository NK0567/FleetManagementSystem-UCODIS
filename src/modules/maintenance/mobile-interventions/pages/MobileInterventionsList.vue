<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { mobileInterventionApi } from '../api/mobileInterventionApi'
import { todayIso } from '@/utils/date'
import { mobileInterventionService } from '../services/mobileInterventionService'
import {
  useMobileInterventionStore,
  type MobileInterventionListView
} from '../stores/mobileInterventionStore'
import type {
  MobileInterventionApi,
  MobileInterventionSearchColumn,
  MobileTeamSummary
} from '../types/mobileIntervention.types'

const { t } = useI18n()
const store = useMobileInterventionStore()
const { formatDateTime, formatInteger, optionLabel } = useListCellFormatters()

const listViewOptions = computed<{ value: MobileInterventionListView; label: string }[]>(() => [
  { value: 'inProgress', label: t('maintenance.mobileInterventions.listView.inProgress') },
  { value: 'closed', label: t('maintenance.mobileInterventions.listView.closed') },
  { value: 'all', label: t('maintenance.mobileInterventions.listView.all') }
])

const month = todayIso().slice(0, 7)
const summary = ref<MobileTeamSummary | null>(null)

async function loadSummary() {
  summary.value = await mobileInterventionService.summary(month).catch(() => null)
}

onMounted(loadSummary)
watch(() => store.items, loadSummary)

const kpiText = computed(() => {
  const value = summary.value
  if (!value) return ''
  const { kpis, targets } = value
  const dash = (n: number | null, unit = '') => (n === null ? '-' : `${n}${unit}`)
  return t('maintenance.mobileInterventions.summary', {
    interventions: kpis.interventions,
    interventionsTarget: targets.interventionsPerMonth,
    resolution: dash(kpis.resolutionRate, ' %'),
    resolutionTarget: targets.resolutionRatePct,
    time: dash(kpis.averageTimeMin),
    timeTarget: targets.averageTimeMin,
    delay: dash(kpis.averageDelayMin),
    checks: kpis.checks,
    checksTarget: targets.checksPerMonth,
    positives: kpis.positives
  })
})

const searchColumnOptions = computed<{ value: MobileInterventionSearchColumn; label: string }[]>(
  () => [
    { value: 'no,vehiclePlate,location', label: t('maintenance.mobileInterventions.search.all') },
    { value: 'no', label: t('maintenance.mobileInterventions.col.no') },
    { value: 'vehiclePlate', label: t('maintenance.mobileInterventions.col.vehiclePlate') },
    { value: 'location', label: t('maintenance.mobileInterventions.col.location') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  {
    sortKey: 'no',
    label: t('maintenance.mobileInterventions.col.no'),
    minW: '110px',
    cell: 'link'
  },
  {
    sortKey: 'missionTypeName',
    label: t('maintenance.mobileInterventions.col.missionTypeNo'),
    minW: '200px'
  },
  {
    sortKey: 'vehiclePlate',
    label: t('maintenance.mobileInterventions.col.vehicleNo'),
    minW: '120px'
  },
  { sortKey: 'location', label: t('maintenance.mobileInterventions.col.location'), minW: '200px' },
  {
    sortKey: 'departedAt',
    label: t('maintenance.mobileInterventions.col.departedAt'),
    minW: '150px',
    formatter: formatDateTime
  },
  {
    sortKey: 'crewNames',
    label: t('maintenance.mobileInterventions.col.crewNames'),
    minW: '200px'
  },
  {
    sortKey: 'delayMin',
    label: t('maintenance.mobileInterventions.col.delayMin'),
    minW: '120px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'status',
    label: t('maintenance.mobileInterventions.col.status'),
    minW: '120px',
    formatter: optionLabel('mobileInterventionStatus')
  },
  {
    sortKey: 'workOrderNo',
    label: t('maintenance.mobileInterventions.col.workOrderNo'),
    minW: '130px'
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
    labelKey: 'maintenance.mobileInterventions.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'mobileInterventionStatus'
  },
  {
    field: 'missionTypeNo',
    labelKey: 'maintenance.mobileInterventions.col.missionTypeNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'missionTypes'
  },
  {
    field: 'vehicleNo',
    labelKey: 'maintenance.mobileInterventions.col.vehicleNo',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'vehicles'
  }
]

const detailKeys = ['missionTypeName', 'location', 'status', 'workOrderNo']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: MobileInterventionApi, column: TableColumn): string {
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
} = useListPage<MobileInterventionApi, MobileInterventionSearchColumn>({
  tableId: 'maintenance-mobile-interventions',
  feature: 'MOBILEINTERVENTION',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'mobile-interventions',
  exportApi: mobileInterventionApi.exportExcel
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.mobileInterventions.title')"
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
        @update:list-view="store.setListView($event as MobileInterventionListView)"
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

      <p v-if="kpiText" class="mx-4 mt-2 text-xs text-muted-foreground">{{ kpiText }}</p>
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
        :loading-text="t('maintenance.mobileInterventions.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('maintenance.mobileInterventions.noResults')"
        :no-search-results-message="
          t('maintenance.mobileInterventions.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as MobileInterventionApi)"
        @row-dblclick="(item) => openFromList((item as MobileInterventionApi).no)"
        @primary-cell-click="(_item, value) => openFromList(String(value))"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as MobileInterventionListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.no">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <p class="text-xs text-muted-foreground font-semibold mb-1">
                    {{ t('maintenance.mobileInterventions.col.vehiclePlate') }}
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

    <MobileInterventionCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :mobile-intervention-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <MobileInterventionCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
