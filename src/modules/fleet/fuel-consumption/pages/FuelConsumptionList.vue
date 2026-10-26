<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { usePermissions } from '@/composables/usePermissions'
import { useUserStore } from '@/stores/user'
import { formatDateTime, formatNumber } from '@/utils/format'
import { fuelConsumptionApi } from '../api/fuelConsumptionApi'
import { fuelConsumptionService } from '../services/fuelConsumptionService'
import {
  useFuelConsumptionStore,
  type FuelConsumptionListView
} from '../stores/fuelConsumptionStore'
import type {
  FuelConsumptionApi,
  FuelConsumptionSearchColumn,
  FuelConsumptionSummary
} from '../types/fuelConsumption.types'

const { t } = useI18n()
const store = useFuelConsumptionStore()
const userStore = useUserStore()
const { canUpdate, canExecute } = usePermissions('FUELCONSUMPTION')
const {
  optionLabel,
  formatDecimal,
  formatInteger,
  formatDateTime: formatDateTimeCell
} = useListCellFormatters()

const listViewOptions = computed<{ value: FuelConsumptionListView; label: string }[]>(() => [
  { value: 'gaps', label: t('fleet.fuelConsumption.listView.gaps') },
  { value: 'toDecide', label: t('fleet.fuelConsumption.listView.toDecide') },
  { value: 'all', label: t('fleet.fuelConsumption.listView.all') }
])

const searchColumnOptions = computed<{ value: FuelConsumptionSearchColumn; label: string }[]>(
  () => [
    { value: 'vehiclePlate,driverName', label: t('fleet.fuelConsumption.search.all') },
    { value: 'vehiclePlate', label: t('fleet.fuelConsumption.col.vehiclePlate') },
    { value: 'driverName', label: t('fleet.fuelConsumption.col.driverName') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'vehiclePlate', label: t('fleet.fuelConsumption.col.vehiclePlate'), minW: '120px' },
  { sortKey: 'driverName', label: t('fleet.fuelConsumption.col.driverName'), minW: '170px' },
  {
    sortKey: 'to',
    label: t('fleet.fuelConsumption.col.to'),
    minW: '150px',
    formatter: formatDateTimeCell
  },
  {
    sortKey: 'km',
    label: t('fleet.fuelConsumption.col.km'),
    minW: '90px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'liters',
    label: t('fleet.fuelConsumption.col.liters'),
    minW: '90px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'l100',
    label: t('fleet.fuelConsumption.col.l100'),
    minW: '90px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'referenceL100',
    label: t('fleet.fuelConsumption.col.referenceL100'),
    minW: '110px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'gapPct',
    label: t('fleet.fuelConsumption.col.gapPct'),
    minW: '90px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'excessCost',
    label: t('fleet.fuelConsumption.col.excessCost'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  {
    sortKey: 'status',
    label: t('fleet.fuelConsumption.col.status'),
    minW: '150px',
    formatter: optionLabel('fuelGapStatus')
  }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'status',
    labelKey: 'fleet.fuelConsumption.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'fuelGapStatus'
  },
  {
    field: 'vehicleNo',
    labelKey: 'fleet.fuelConsumption.col.vehiclePlate',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'motorizedVehicles'
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
} = useListPage<FuelConsumptionApi, FuelConsumptionSearchColumn>({
  tableId: 'fleet-fuel-consumption',
  feature: 'FUELCONSUMPTION',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'fuel-consumption',
  exportApi: fuelConsumptionApi.exportExcel,
  hasCard: false
})

const summary = ref<FuelConsumptionSummary | null>(null)

async function loadSummary() {
  summary.value = await fuelConsumptionService.summary().catch(() => null)
}

onMounted(loadSummary)
watch(() => store.items, loadSummary)

const selected = computed(() => store.selectedItem)
const working = ref(false)
const actionError = ref<string | null>(null)

async function run(action: () => Promise<FuelConsumptionApi>) {
  working.value = true
  actionError.value = null
  try {
    store.selectItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    actionError.value = apiErrorMessage(error, t('fleet.fuelConsumption.actionError'))
    return false
  } finally {
    working.value = false
  }
}

type Dialog = 'qualify' | 'propose' | 'approve' | 'reject' | 'dismiss' | null
const dialog = ref<Dialog>(null)
const causeNo = ref<string | null>(null)
const comment = ref('')
const amount = ref<number | null>(null)

function open(next: Exclude<Dialog, null>) {
  causeNo.value = null
  comment.value = ''
  amount.value = selected.value ? Math.min(selected.value.excessCost, 50_000) : null
  dialog.value = next
}

const ownProposal = computed(() => selected.value?.proposedBy === userStore.user?.code)
const confirmDisabled = computed(() => {
  if (dialog.value === 'qualify') return !causeNo.value || !comment.value.trim()
  if (dialog.value === 'propose') return !amount.value
  if (dialog.value === 'approve') return false
  return !comment.value.trim()
})

async function confirm() {
  const no = selected.value?.no
  if (!no) return
  const done = await run(() => {
    switch (dialog.value) {
      case 'qualify':
        return fuelConsumptionService.qualify(no, causeNo.value ?? '', comment.value)
      case 'propose':
        return fuelConsumptionService.propose(no, amount.value ?? 0)
      case 'approve':
        return fuelConsumptionService.decide(no, true, comment.value)
      case 'reject':
        return fuelConsumptionService.decide(no, false, comment.value)
      default:
        return fuelConsumptionService.dismiss(no, comment.value)
    }
  })
  if (done) dialog.value = null
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.fuelConsumption.title')"
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
        @update:list-view="store.setListView($event as FuelConsumptionListView)"
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

      <p v-if="summary" class="mx-4 mt-2 text-xs text-muted-foreground">
        {{
          t('fleet.fuelConsumption.summary', {
            liters: formatNumber(summary.liters),
            amount: formatNumber(summary.amount),
            average: summary.averageL100 === null ? '—' : formatNumber(summary.averageL100, 1),
            co2: formatNumber(summary.co2Kg),
            refills: summary.refillsToQualify,
            gaps: summary.gapsToQualify
          })
        }}
      </p>
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
        :loading-text="t('fleet.fuelConsumption.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.fuelConsumption.noResults')"
        :no-search-results-message="
          t('fleet.fuelConsumption.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as FuelConsumptionApi)"
      >
        <template #cell-status="{ item }">
          <FuelGapStatusPill :status="(item as FuelConsumptionApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as FuelConsumptionListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="selected" :record-no="selected.vehiclePlate">
            <template #details>
              <div class="px-4 py-4 space-y-2 flex-1 overflow-y-auto text-sm">
                <FuelGapStatusPill :status="selected.status" />
                <p class="text-muted-foreground">
                  {{ formatDateTime(selected.from) }} → {{ formatDateTime(selected.to) }}
                </p>
                <p class="text-card-foreground">
                  {{
                    t('fleet.fuelConsumption.periodDetail', {
                      km: formatNumber(selected.km),
                      liters: formatNumber(selected.liters, 1),
                      l100: selected.l100 === null ? '—' : formatNumber(selected.l100, 1),
                      reference: formatNumber(selected.referenceL100, 1),
                      source: optionLabel('fuelReferenceSource')(selected.referenceSource, selected)
                    })
                  }}
                </p>
                <p v-if="selected.excessCost" class="text-card-foreground">
                  {{
                    t('fleet.fuelConsumption.excess', { amount: formatNumber(selected.excessCost) })
                  }}
                </p>
                <template v-if="selected.causeNo">
                  <p class="font-medium text-card-foreground">{{ selected.causeName }}</p>
                  <p class="text-card-foreground">{{ selected.comment }}</p>
                </template>
                <p v-if="selected.proposedAmount" class="text-card-foreground">
                  {{
                    t('fleet.fuelConsumption.proposed', {
                      amount: formatNumber(selected.proposedAmount),
                      user: selected.proposedBy
                    })
                  }}
                </p>
                <p v-if="selected.decisionComment" class="text-muted-foreground">
                  {{ selected.decisionComment }}
                </p>
                <p
                  v-if="ownProposal && selected.status === 'deduction_proposed'"
                  class="text-xs text-muted-foreground"
                >
                  {{ t('fleet.fuelConsumption.ownProposal') }}
                </p>
              </div>
            </template>
            <template #footer>
              <template v-if="canUpdate && selected.status === 'to_qualify'">
                <button
                  type="button"
                  class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium"
                  @click="open('qualify')"
                >
                  {{ t('fleet.fuelConsumption.action.qualify') }}
                </button>
              </template>
              <button
                v-if="canUpdate && selected.status === 'qualified' && selected.chargeable"
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium"
                @click="open('propose')"
              >
                {{ t('fleet.fuelConsumption.action.propose') }}
              </button>
              <template
                v-if="canExecute && selected.status === 'deduction_proposed' && !ownProposal"
              >
                <button
                  type="button"
                  class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium"
                  @click="open('approve')"
                >
                  {{ t('fleet.fuelConsumption.action.approve') }}
                </button>
                <button
                  type="button"
                  class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                  @click="open('reject')"
                >
                  {{ t('fleet.fuelConsumption.action.reject') }}
                </button>
              </template>
              <button
                v-if="
                  canUpdate && (selected.status === 'to_qualify' || selected.status === 'qualified')
                "
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                @click="open('dismiss')"
              >
                {{ t('fleet.fuelConsumption.action.dismiss') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <ConfirmDialog
      :open="!!dialog"
      :title="dialog ? t(`fleet.fuelConsumption.action.${dialog}`) : ''"
      :confirm-label="t('common.confirm')"
      :confirm-disabled="confirmDisabled"
      :loading="working"
      panel-class="max-w-md"
      @confirm="confirm"
      @cancel="dialog = null"
    >
      <div class="space-y-3">
        <BaseFormField
          v-if="dialog === 'qualify'"
          :label="t('fleet.fuelConsumption.form.cause')"
          required
        >
          <ReferenceLookup
            v-model="causeNo"
            reference-key="fuelGapCauses"
            :modal-title="t('fleet.fuelConsumption.form.cause')"
          />
        </BaseFormField>
        <BaseFormField
          v-if="dialog === 'propose'"
          :label="t('fleet.fuelConsumption.form.amount')"
          required
        >
          <FormInput v-model="amount" type="number" :min="1" />
          <p class="text-xs text-muted-foreground mt-1">
            {{
              t('fleet.fuelConsumption.form.amountHint', {
                amount: formatNumber(selected?.excessCost ?? 0)
              })
            }}
          </p>
        </BaseFormField>
        <BaseFormField
          v-if="dialog !== 'propose'"
          :label="t('fleet.fuelConsumption.form.comment')"
          :required="dialog !== 'approve'"
        >
          <FormTextarea v-model="comment" :rows="3" :maxlength="300" />
        </BaseFormField>
      </div>
    </ConfirmDialog>
  </div>
</template>
