<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { usePermissions } from '@/composables/usePermissions'
import { todayIso } from '@/utils/date'
import { formatDate, formatNumber } from '@/utils/format'
import { serviceDueApi, type ServiceDueSummary } from '../api/serviceDueApi'
import { needsService } from '../domain/serviceDue'
import { serviceDueService } from '../services/serviceDueService'
import { useServiceDueStore, type ServiceDueListView } from '../stores/serviceDueStore'
import type { ServiceDueApi, ServiceDueSearchColumn } from '../types/serviceDue.types'

const { t } = useI18n()
const router = useRouter()
const store = useServiceDueStore()
const { canInsert } = usePermissions('SERVICEDUE')
const { canInsert: canOpenOrder } = usePermissions('WORKORDER')
const { optionLabel, formatInteger, formatDate: formatDateCell } = useListCellFormatters()

const summary = ref<ServiceDueSummary | null>(null)

async function loadSummary() {
  summary.value = await serviceDueService.summary().catch(() => null)
}

onMounted(loadSummary)
watch(() => store.items, loadSummary)

const listViewOptions = computed<{ value: ServiceDueListView; label: string }[]>(() => [
  { value: 'toPlan', label: t('maintenance.serviceDue.listView.toPlan') },
  { value: 'unknown', label: t('maintenance.serviceDue.listView.unknown') },
  { value: 'all', label: t('maintenance.serviceDue.listView.all') }
])

const searchColumnOptions = computed<{ value: ServiceDueSearchColumn; label: string }[]>(() => [
  { value: 'vehiclePlate,operationLabel,planName', label: t('maintenance.serviceDue.search.all') },
  { value: 'vehiclePlate', label: t('maintenance.serviceDue.col.vehiclePlate') },
  { value: 'operationLabel', label: t('maintenance.serviceDue.col.operationLabel') },
  { value: 'planName', label: t('maintenance.serviceDue.col.planName') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'vehiclePlate', label: t('maintenance.serviceDue.col.vehiclePlate'), minW: '120px' },
  {
    sortKey: 'operationLabel',
    label: t('maintenance.serviceDue.col.operationLabel'),
    minW: '280px'
  },
  {
    sortKey: 'subsystemName',
    label: t('maintenance.serviceDue.col.subsystemName'),
    minW: '160px',
    defaultHidden: true
  },
  {
    sortKey: 'nature',
    label: t('maintenance.serviceDue.col.nature'),
    minW: '110px',
    formatter: optionLabel('operationNature')
  },
  { sortKey: 'planName', label: t('maintenance.serviceDue.col.planName'), minW: '170px' },
  {
    sortKey: 'nextKm',
    label: t('maintenance.serviceDue.col.nextKm'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'kmRemaining',
    label: t('maintenance.serviceDue.col.kmRemaining'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'nextHours',
    label: t('maintenance.serviceDue.col.nextHours'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'hoursRemaining',
    label: t('maintenance.serviceDue.col.hoursRemaining'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'currentHours',
    label: t('maintenance.serviceDue.col.currentHours'),
    minW: '120px',
    align: 'right',
    defaultHidden: true,
    formatter: formatInteger
  },
  {
    sortKey: 'nextDate',
    label: t('maintenance.serviceDue.col.nextDate'),
    minW: '120px',
    formatter: formatDateCell
  },
  {
    sortKey: 'daysRemaining',
    label: t('maintenance.serviceDue.col.daysRemaining'),
    minW: '100px',
    align: 'right',
    formatter: formatInteger
  },
  { sortKey: 'status', label: t('maintenance.serviceDue.col.status'), minW: '120px' },
  { sortKey: 'openOrderNo', label: t('maintenance.serviceDue.col.openOrderNo'), minW: '130px' }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'status',
    labelKey: 'maintenance.serviceDue.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'serviceDueStatus'
  },
  {
    field: 'vehicleNo',
    labelKey: 'maintenance.serviceDue.col.vehiclePlate',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'planVehicles'
  },
  {
    field: 'nature',
    labelKey: 'maintenance.serviceDue.col.nature',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'operationNature'
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
} = useListPage<ServiceDueApi, ServiceDueSearchColumn>({
  tableId: 'maintenance-service-due',
  feature: 'SERVICEDUE',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'service-due',
  exportApi: serviceDueApi.exportExcel,
  hasCard: false
})

const selected = computed(() => store.selectedItem)
const working = ref(false)
const actionError = ref<string | null>(null)
const recording = ref(false)
const passage = ref({ km: null as number | null, hours: null as number | null, date: todayIso() })

function openPassage() {
  passage.value = { km: null, hours: null, date: todayIso() }
  recording.value = true
}

const readingHours = ref(false)
const engineHours = ref<number | null>(null)

function openEngineHours() {
  engineHours.value = selected.value?.currentHours ?? null
  readingHours.value = true
}

async function recordEngineHours() {
  const due = selected.value
  if (!due || engineHours.value === null) return
  working.value = true
  actionError.value = null
  try {
    await serviceDueService.recordEngineHours(due.vehicleNo, engineHours.value)
    readingHours.value = false
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    store.selectItem(store.items.find((item) => item.no === due.no) ?? null)
  } catch (error) {
    actionError.value = apiErrorMessage(error, t('maintenance.serviceDue.actionError'))
  } finally {
    working.value = false
  }
}

async function recordPassage() {
  const due = selected.value
  if (!due) return
  working.value = true
  actionError.value = null
  try {
    store.selectItem(
      await serviceDueService.recordPassage({
        vehicleNo: due.vehicleNo,
        operationNo: due.operationNo,
        km: passage.value.km,
        hours: passage.value.hours,
        date: passage.value.date
      })
    )
    recording.value = false
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    actionError.value = apiErrorMessage(error, t('maintenance.serviceDue.actionError'))
  } finally {
    working.value = false
  }
}

const openOrder = (no: string) =>
  router.push({ path: '/maintenance/work-orders', query: { no, cardMode: 'view' } })

async function openWorkOrder() {
  const due = selected.value
  if (!due) return
  working.value = true
  actionError.value = null
  try {
    const order = await serviceDueService.openWorkOrder(due.vehicleNo)
    await openOrder(order.no)
  } catch (error) {
    actionError.value = apiErrorMessage(error, t('maintenance.serviceDue.actionError'))
  } finally {
    working.value = false
  }
}

const interval = (due: ServiceDueApi) =>
  [
    due.intervalKm ? t('maintenance.serviceDue.everyKm', { km: formatNumber(due.intervalKm) }) : '',
    due.intervalHours
      ? t('maintenance.serviceDue.everyHours', { hours: formatNumber(due.intervalHours) })
      : '',
    due.intervalDays ? t('maintenance.serviceDue.everyDays', due.intervalDays) : ''
  ]
    .filter(Boolean)
    .join(' · ')
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('maintenance.serviceDue.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-create="false"
        :list-view-options="listViewOptions"
        :list-view="store.listView"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @update:list-view="store.setListView($event as ServiceDueListView)"
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

      <div v-if="summary" class="mx-4 mt-2 flex flex-wrap gap-2 text-xs">
        <span
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium"
          :class="
            summary.overdue
              ? 'bg-destructive/10 text-destructive'
              : 'bg-accent text-muted-foreground'
          "
        >
          {{ t('maintenance.serviceDue.summary.overdue', summary.overdue) }}
          <template v-if="summary.blocking">
            · {{ t('maintenance.serviceDue.summary.blocking', summary.blocking) }}
          </template>
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium"
          :class="
            summary.dueSoon ? 'bg-warning-bg text-warning' : 'bg-accent text-muted-foreground'
          "
        >
          {{ t('maintenance.serviceDue.summary.dueSoon', summary.dueSoon) }}
        </span>
      </div>
      <FormAlerts class="mx-4" :error="exportError" @clear:error="exportError = null" />
      <FormAlerts class="mx-4" :error="actionError" @clear:error="actionError = null" />

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
        :loading-text="t('maintenance.serviceDue.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('maintenance.serviceDue.noResults')"
        :no-search-results-message="
          t('maintenance.serviceDue.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as ServiceDueApi)"
      >
        <template #cell-status="{ item }">
          <ServiceDueStatusPill :status="(item as ServiceDueApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as ServiceDueListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="selected" :record-no="selected.vehiclePlate">
            <template #details>
              <div class="px-4 py-4 space-y-2 flex-1 overflow-y-auto text-sm">
                <ServiceDueStatusPill :status="selected.status" />
                <p class="font-medium text-card-foreground">{{ selected.operationLabel }}</p>
                <p class="text-muted-foreground">
                  {{ selected.planName }} · {{ interval(selected) }}
                </p>
                <p v-if="selected.provisional" class="text-xs text-muted-foreground">
                  {{ t('maintenance.serviceDue.provisional') }}
                </p>
                <p v-if="selected.status === 'blocking'" class="text-xs text-destructive">
                  {{ t('maintenance.serviceDue.blockingHint') }}
                </p>
                <p v-if="selected.status === 'due_soon'" class="text-xs text-warning">
                  {{ t('maintenance.serviceDue.dueSoonHint') }}
                </p>
                <p class="text-card-foreground">
                  {{
                    selected.lastDate
                      ? t('maintenance.serviceDue.lastPassage', {
                          date: formatDate(selected.lastDate),
                          km: selected.lastKm === null ? '-' : formatNumber(selected.lastKm)
                        })
                      : t('maintenance.serviceDue.noPassage')
                  }}
                </p>
                <p v-if="selected.intervalHours" class="text-card-foreground">
                  {{
                    selected.currentHours === null
                      ? t('maintenance.serviceDue.noHourMeter')
                      : t('maintenance.serviceDue.hourMeter', {
                          hours: formatNumber(selected.currentHours),
                          last: selected.lastHours === null ? '-' : formatNumber(selected.lastHours)
                        })
                  }}
                </p>
                <p v-if="selected.openOrderNo" class="text-card-foreground">
                  {{ t('maintenance.serviceDue.coveredBy') }}
                  <button
                    type="button"
                    class="cursor-pointer text-primary hover:underline"
                    @click="openOrder(selected.openOrderNo)"
                  >
                    {{ selected.openOrderNo }}
                  </button>
                </p>
              </div>
            </template>
            <template #footer>
              <button
                v-if="canOpenOrder && needsService(selected.status) && !selected.openOrderNo"
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium disabled:opacity-60"
                :disabled="working"
                @click="openWorkOrder"
              >
                {{ t('maintenance.serviceDue.action.openWorkOrder') }}
              </button>
              <button
                v-if="canInsert"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                @click="openPassage"
              >
                {{ t('maintenance.serviceDue.action.recordPassage') }}
              </button>
              <button
                v-if="canInsert && selected.intervalHours"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                @click="openEngineHours"
              >
                {{ t('maintenance.serviceDue.action.recordHours') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <ConfirmDialog
      :open="recording"
      :title="t('maintenance.serviceDue.action.recordPassage')"
      :confirm-label="t('common.confirm')"
      :confirm-disabled="!passage.date"
      :loading="working"
      panel-class="max-w-md"
      @confirm="recordPassage"
      @cancel="recording = false"
    >
      <div class="space-y-3">
        <p v-if="selected" class="text-sm text-muted-foreground">
          {{ selected.vehiclePlate }} · {{ selected.operationLabel }}
        </p>
        <BaseFormField :label="t('maintenance.serviceDue.form.date')" required>
          <DateFormInput v-model="passage.date" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.serviceDue.form.km')">
          <FormInput v-model="passage.km" type="number" :min="0" />
        </BaseFormField>
        <BaseFormField
          v-if="selected?.intervalHours"
          :label="t('maintenance.serviceDue.form.hours')"
        >
          <FormInput v-model="passage.hours" type="number" :min="0" />
        </BaseFormField>
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      :open="readingHours"
      :title="t('maintenance.serviceDue.action.recordHours')"
      :confirm-label="t('common.confirm')"
      :confirm-disabled="engineHours === null || engineHours < 0"
      :loading="working"
      panel-class="max-w-md"
      @confirm="recordEngineHours"
      @cancel="readingHours = false"
    >
      <div class="space-y-3">
        <p v-if="selected" class="text-sm text-muted-foreground">{{ selected.vehiclePlate }}</p>
        <BaseFormField :label="t('maintenance.serviceDue.form.engineHours')" required>
          <FormInput v-model="engineHours" type="number" :min="0" />
        </BaseFormField>
      </div>
    </ConfirmDialog>
  </div>
</template>
