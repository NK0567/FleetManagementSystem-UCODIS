<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, TriangleAlert } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { maintenancePlanApi } from '../api/maintenancePlanApi'
import { maintenancePlanService } from '../services/maintenancePlanService'
import { useMaintenancePlanStore } from '../stores/maintenancePlanStore'
import type {
  MaintenancePlanApi,
  MaintenancePlanSearchColumn,
  PlanCoverageApi
} from '../types/maintenancePlan.types'

const { t } = useI18n()
const store = useMaintenancePlanStore()
const { canUpdate: canUpdatePlan } = usePermissions('MAINTENANCEPLAN')
const coverage = ref<PlanCoverageApi | null>(null)
const coverageWorking = ref(false)
const coverageError = ref<string | null>(null)

async function loadCoverage() {
  coverage.value = await maintenancePlanService.coverage().catch(() => null)
}

onMounted(loadCoverage)
watch(() => store.items, loadCoverage)

async function createForModel(code: string) {
  coverageWorking.value = true
  coverageError.value = null
  try {
    onCreated(await maintenancePlanService.createForModel(code))
  } catch (error) {
    coverageError.value = apiErrorMessage(error, t('maintenance.maintenancePlans.coverage.error'))
  } finally {
    coverageWorking.value = false
  }
}

async function reactivate(no: string) {
  coverageWorking.value = true
  coverageError.value = null
  try {
    await maintenancePlanService.update(no, { active: true })
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    coverageError.value = apiErrorMessage(error, t('maintenance.maintenancePlans.coverage.error'))
  } finally {
    coverageWorking.value = false
  }
}
const { formatDateTime, booleanLabel, formatInteger } = useListCellFormatters()

const searchColumnOptions = computed<{ value: MaintenancePlanSearchColumn; label: string }[]>(
  () => [
    { value: 'no,name', label: t('maintenance.maintenancePlans.search.all') },
    { value: 'no', label: t('maintenance.maintenancePlans.col.no') },
    { value: 'name', label: t('maintenance.maintenancePlans.col.name') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('maintenance.maintenancePlans.col.no'), minW: '110px', cell: 'link' },
  { sortKey: 'name', label: t('maintenance.maintenancePlans.col.name'), minW: '260px' },
  {
    sortKey: 'provisional',
    label: t('maintenance.maintenancePlans.col.provisional'),
    minW: '110px',
    formatter: booleanLabel
  },
  {
    sortKey: 'active',
    label: t('maintenance.maintenancePlans.col.active'),
    minW: '90px',
    formatter: booleanLabel
  },
  { sortKey: 'modelNames', label: t('maintenance.maintenancePlans.col.modelNames'), minW: '200px' },
  {
    sortKey: 'vehicleCount',
    label: t('maintenance.maintenancePlans.col.vehicleCount'),
    minW: '100px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'operationCount',
    label: t('maintenance.maintenancePlans.col.operationCount'),
    minW: '110px',
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

const detailKeys = ['modelNames', 'provisional', 'vehicleCount', 'operationCount']
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: MaintenancePlanApi, column: TableColumn): string {
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
} = useListPage<MaintenancePlanApi, MaintenancePlanSearchColumn>({
  tableId: 'maintenance-maintenance-plans',
  feature: 'MAINTENANCEPLAN',
  store,
  columns: tableColumns,
  exportFileBaseName: 'maintenance-plans',
  exportApi: maintenancePlanApi.exportExcel,
  remove: maintenancePlanService.remove,
  deleteErrorFallback: t('maintenance.maintenancePlans.deleteError')
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.maintenancePlans.title')"
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
      </ListPageToolbar>

      <FormAlerts
        class="mx-4"
        :error="coverageError ?? deleteError ?? exportError"
        @clear:error="coverageError = deleteError = exportError = null"
      />
      <div
        v-if="coverage && (coverage.modelsWithoutPlan.length || coverage.inactivePlansInUse.length)"
        class="mx-4 mt-2 flex items-start gap-2.5 rounded border border-warning/30 bg-warning/10 px-3 py-2.5 text-warning"
      >
        <TriangleAlert class="w-4 h-4 shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0 space-y-2">
          <template v-if="coverage.modelsWithoutPlan.length">
            <p class="text-xs font-medium">
              {{
                t(
                  'maintenance.maintenancePlans.coverage.modelsWithoutPlan',
                  coverage.modelsWithoutPlan.length
                )
              }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <component
                :is="canInsert ? 'button' : 'span'"
                v-for="model in coverage.modelsWithoutPlan"
                :key="model.modelCode"
                :type="canInsert ? 'button' : undefined"
                class="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-card px-2.5 py-1 text-xs font-medium"
                :class="canInsert ? 'cursor-pointer hover:bg-warning/10 disabled:opacity-60' : ''"
                :disabled="canInsert ? coverageWorking : undefined"
                @click="canInsert && createForModel(model.modelCode)"
              >
                <Plus v-if="canInsert" class="w-3 h-3" />
                {{ model.modelName }}
                <span class="opacity-70">
                  {{ t('maintenance.maintenancePlans.coverage.vehicles', model.vehicleCount) }}
                </span>
              </component>
            </div>
          </template>
          <template v-if="coverage.inactivePlansInUse.length">
            <p class="text-xs font-medium">
              {{
                t(
                  'maintenance.maintenancePlans.coverage.inactivePlans',
                  coverage.inactivePlansInUse.length
                )
              }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <component
                :is="canUpdatePlan ? 'button' : 'span'"
                v-for="plan in coverage.inactivePlansInUse"
                :key="plan.no"
                :type="canUpdatePlan ? 'button' : undefined"
                class="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-card px-2.5 py-1 text-xs font-medium"
                :class="
                  canUpdatePlan ? 'cursor-pointer hover:bg-warning/10 disabled:opacity-60' : ''
                "
                :disabled="canUpdatePlan ? coverageWorking : undefined"
                @click="canUpdatePlan && reactivate(plan.no)"
              >
                {{
                  canUpdatePlan
                    ? t('maintenance.maintenancePlans.coverage.reactivate', { name: plan.name })
                    : plan.name
                }}
                <span class="opacity-70">
                  {{ t('maintenance.maintenancePlans.coverage.vehicles', plan.vehicleCount) }}
                </span>
              </component>
            </div>
          </template>
        </div>
      </div>

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
        :loading-text="t('maintenance.maintenancePlans.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('maintenance.maintenancePlans.noResults')"
        :no-search-results-message="
          t('maintenance.maintenancePlans.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as MaintenancePlanApi)"
        @row-dblclick="(item) => openFromList((item as MaintenancePlanApi).no)"
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
                    {{ t('maintenance.maintenancePlans.col.name') }}
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
      :title="t('maintenance.maintenancePlans.confirmDelete')"
      :message="t('maintenance.maintenancePlans.confirmDeleteMsg', { name: itemToDelete?.name })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      destructive
      @confirm="confirmDelete"
      @cancel="itemToDelete = null"
    />

    <MaintenancePlanCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :maintenance-plan-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <MaintenancePlanCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
