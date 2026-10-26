<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Link2 } from '@lucide/vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { formatDateTime, formatNumber } from '@/utils/format'
import { fuelCardTransactionApi } from '../api/fuelCardTransactionApi'
import { fuelCardTransactionService } from '../services/fuelCardTransactionService'
import {
  useFuelCardTransactionStore,
  type FuelCardTransactionListView
} from '../stores/fuelCardTransactionStore'
import type {
  FuelCardTransactionApi,
  FuelCardTransactionSearchColumn
} from '../types/fuelCardTransaction.types'

const { t } = useI18n()
const router = useRouter()
const store = useFuelCardTransactionStore()
const {
  optionLabel,
  formatDecimal,
  formatInteger,
  formatDateTime: formatDateTimeCell
} = useListCellFormatters()

const listViewOptions = computed<{ value: FuelCardTransactionListView; label: string }[]>(() => [
  { value: 'unmatched', label: t('fleet.fuelCardTransactions.listView.unmatched') },
  { value: 'overruns', label: t('fleet.fuelCardTransactions.listView.overruns') },
  { value: 'all', label: t('fleet.fuelCardTransactions.listView.all') }
])

const searchColumnOptions = computed<{ value: FuelCardTransactionSearchColumn; label: string }[]>(
  () => [
    { value: 'no,cardNumber,station,city', label: t('fleet.fuelCardTransactions.search.all') },
    { value: 'cardNumber', label: t('fleet.fuelCardTransactions.col.cardNumber') },
    { value: 'station', label: t('fleet.fuelCardTransactions.col.station') },
    { value: 'city', label: t('fleet.fuelCardTransactions.col.city') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.fuelCardTransactions.col.no'), minW: '110px' },
  {
    sortKey: 'transactedAt',
    label: t('fleet.fuelCardTransactions.col.transactedAt'),
    minW: '150px',
    formatter: formatDateTimeCell
  },
  { sortKey: 'cardNumber', label: t('fleet.fuelCardTransactions.col.cardNumber'), minW: '170px' },
  { sortKey: 'holderName', label: t('fleet.fuelCardTransactions.col.holderName'), minW: '160px' },
  { sortKey: 'station', label: t('fleet.fuelCardTransactions.col.station'), minW: '180px' },
  { sortKey: 'city', label: t('fleet.fuelCardTransactions.col.city'), minW: '120px' },
  {
    sortKey: 'liters',
    label: t('fleet.fuelCardTransactions.col.liters'),
    minW: '90px',
    align: 'right',
    formatter: formatDecimal
  },
  {
    sortKey: 'amount',
    label: t('fleet.fuelCardTransactions.col.amount'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  },
  { sortKey: 'refillNo', label: t('fleet.fuelCardTransactions.col.refillNo'), minW: '130px' },
  {
    sortKey: 'overrunCount',
    label: t('fleet.fuelCardTransactions.col.overrunCount'),
    minW: '110px',
    align: 'right',
    formatter: formatInteger
  }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'cardNo',
    labelKey: 'fleet.fuelCardTransactions.col.cardNumber',
    valueType: 'string',
    kind: 'reference',
    referenceKey: 'fuelCards'
  }
]

const {
  canInsert,
  canUpdate,
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
  showCreateModal,
  openCreateModal,
  onSort,
  onSearchColumnChange,
  onUpdateUserFilters,
  onReorderColumns
} = useListPage<FuelCardTransactionApi, FuelCardTransactionSearchColumn>({
  tableId: 'fleet-fuel-card-transactions',
  feature: 'FUELCARD',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'fuel-card-transactions',
  exportApi: fuelCardTransactionApi.exportExcel,
  hasCard: false
})

const selected = computed(() => store.selectedItem)
const working = ref(false)
const actionError = ref<string | null>(null)
const info = ref<string | null>(null)

async function run(action: () => Promise<FuelCardTransactionApi>) {
  working.value = true
  actionError.value = null
  try {
    store.selectItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    actionError.value = apiErrorMessage(error, t('fleet.fuelCardTransactions.actionError'))
    return false
  } finally {
    working.value = false
  }
}

async function matchAll() {
  working.value = true
  actionError.value = null
  try {
    const matched = await fuelCardTransactionService.matchAll()
    info.value = t('fleet.fuelCardTransactions.matched', matched)
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    actionError.value = apiErrorMessage(error, t('fleet.fuelCardTransactions.actionError'))
  } finally {
    working.value = false
  }
}

function matchCandidate(transaction: FuelCardTransactionApi) {
  const refillNo = transaction.candidateNo
  if (refillNo) void run(() => fuelCardTransactionService.match(transaction.no, refillNo))
}

function detach(transaction: FuelCardTransactionApi) {
  void run(() => fuelCardTransactionService.detach(transaction.no))
}

const showRefill = ref(false)
const odometerKm = ref<number | null>(null)
const fullTank = ref(true)

function openRefill() {
  odometerKm.value = null
  fullTank.value = true
  showRefill.value = true
}

async function confirmRefill() {
  const transaction = selected.value
  if (!transaction || odometerKm.value === null) return
  const km = odometerKm.value
  const done = await run(() =>
    fuelCardTransactionService.createRefill(transaction.no, km, fullTank.value)
  )
  if (done) showRefill.value = false
}

function openRefillCard(no: string) {
  void router.push({ path: '/fleet/fuel-refills', query: { no, cardMode: 'view' } })
}

async function onCreated() {
  await store.fetchItems(store.pagination.page, store.pagination.limit)
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.fuelCardTransactions.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-create="canInsert"
        :list-view-options="listViewOptions"
        :list-view="store.listView"
        :search-column="store.searchColumn"
        :search-query="store.searchQuery"
        :column-options="searchColumnOptions"
        :search-loading="store.loading"
        @update:list-view="store.setListView($event as FuelCardTransactionListView)"
        @toggle-filter="showFilterPanel = !showFilterPanel"
        @toggle-details="showDetailsPanel = !showDetailsPanel"
        @create="openCreateModal"
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
        <template v-if="canUpdate" #extra-actions>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60"
            :disabled="working"
            @click="matchAll"
          >
            <Link2 class="w-4 h-4 text-primary" />
            {{ t('fleet.fuelCardTransactions.action.matchAll') }}
          </button>
        </template>
      </ListPageToolbar>

      <p v-if="info" class="mx-4 mt-2 text-xs text-muted-foreground">{{ info }}</p>
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
        :loading-text="t('fleet.fuelCardTransactions.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.fuelCardTransactions.noResults')"
        :no-search-results-message="
          t('fleet.fuelCardTransactions.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as FuelCardTransactionApi)"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as FuelCardTransactionListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="selected" :record-no="selected.no">
            <template #details>
              <div class="px-4 py-4 space-y-2 flex-1 overflow-y-auto text-sm">
                <p class="text-card-foreground">
                  {{ formatDateTime(selected.transactedAt) }} · {{ selected.station }} ({{
                    selected.city
                  }})
                </p>
                <p class="text-card-foreground">
                  {{ formatNumber(selected.liters, 1) }} L · {{ formatNumber(selected.amount) }}
                </p>
                <ul v-if="selected.overruns.length" class="space-y-1">
                  <li
                    v-for="overrun in selected.overruns"
                    :key="overrun.code"
                    class="text-destructive"
                  >
                    {{ overrun.detail }}
                  </li>
                </ul>
                <p v-if="selected.refillNo" class="text-card-foreground">
                  {{
                    t('fleet.fuelCardTransactions.matchedWith', {
                      refill: selected.refillNo,
                      mode: optionLabel('matchMode')(selected.matchMode, selected)
                    })
                  }}
                </p>
                <p v-else-if="selected.candidateNo" class="text-muted-foreground">
                  {{ t('fleet.fuelCardTransactions.candidate', { refill: selected.candidateNo }) }}
                </p>
                <p v-else class="text-muted-foreground">
                  {{ t('fleet.fuelCardTransactions.noCandidate') }}
                </p>
                <p v-if="selected.matchMode === 'detached'" class="text-xs text-muted-foreground">
                  {{ t('fleet.fuelCardTransactions.detachedHint') }}
                </p>
              </div>
            </template>
            <template #footer>
              <button
                v-if="selected.refillNo"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                @click="openRefillCard(selected.refillNo)"
              >
                {{ t('fleet.fuelCardTransactions.action.openRefill') }}
              </button>
              <button
                v-if="canUpdate && selected.refillNo"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium disabled:opacity-60"
                :disabled="working"
                @click="detach(selected)"
              >
                {{ t('fleet.fuelCardTransactions.action.detach') }}
              </button>
              <button
                v-if="canUpdate && !selected.refillNo && selected.candidateNo"
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium disabled:opacity-60"
                :disabled="working"
                @click="matchCandidate(selected)"
              >
                {{ t('fleet.fuelCardTransactions.action.match') }}
              </button>
              <button
                v-if="canUpdate && !selected.refillNo && !selected.candidateNo"
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium disabled:opacity-60"
                :disabled="working"
                @click="openRefill"
              >
                {{ t('fleet.fuelCardTransactions.action.createRefill') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <FuelCardTransactionCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />

    <ConfirmDialog
      :open="showRefill"
      :title="t('fleet.fuelCardTransactions.action.createRefill')"
      :confirm-label="t('common.confirm')"
      :confirm-disabled="odometerKm === null"
      :loading="working"
      panel-class="max-w-md"
      @confirm="confirmRefill"
      @cancel="showRefill = false"
    >
      <div class="space-y-3">
        <BaseFormField :label="t('fleet.fuelRefills.form.odometerKm')" required>
          <FormInput v-model="odometerKm" type="number" :min="0" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelRefills.form.fullTank')">
          <ToggleSwitch v-model="fullTank" />
        </BaseFormField>
      </div>
    </ConfirmDialog>
  </div>
</template>
