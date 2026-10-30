<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Cable, Plus, RefreshCw, Upload, Truck } from '@lucide/vue'
import type { MoreAction } from '@/components/shared/MoreActionsMenu.vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { usePermissions } from '@/composables/usePermissions'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { apiErrorMessage } from '@/core/api/apiError'
import { useUserStore } from '@/stores/user'
import { usePlanningCircuit } from '@/modules/planning/planning-settings'
import OrdererApiDialog from '../components/OrdererApiDialog.vue'
import { deliveryRequestApi } from '../api/deliveryRequestApi'
import { deliveryRequestService } from '../services/deliveryRequestService'
import { useDeliveryRequestStore } from '../stores/deliveryRequestStore'
import type {
  DeliveryRequestApi,
  DeliveryRequestSearchColumn
} from '../types/deliveryRequest.types'

const { t } = useI18n()
const router = useRouter()
const importing = ref(false)
const creatingOrder = ref(false)
const { canInsert: canCreateOrder } = usePermissions('TRANSPORTORDER')
const { canExecute: canReceive } = usePermissions('DELIVERYREQUEST')

/* The ways in the company opened (TRS01-US01, TRS07-US05): an orderer account transmits its
 * orders as a service; the planner keys them, imports a file, synchronises the management
 * system or follows what the external orderers send through the API. */
const { circuit } = usePlanningCircuit()
const isOrderer = computed(() => !!useUserStore().user?.ordererNo)
const entryOpen = computed(() =>
  isOrderer.value ? circuit.value.intake.serviceTransmission : circuit.value.intake.manualEntry
)
const syncing = ref(false)
const syncMessage = ref<string | null>(null)
const syncError = ref<string | null>(null)
const showingApi = ref(false)
async function syncConnector() {
  syncing.value = true
  syncMessage.value = null
  syncError.value = null
  try {
    const received = await deliveryRequestService.syncConnector()
    syncMessage.value = t('planning.deliveryRequests.intake.synced', received.length)
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (cause) {
    syncError.value = apiErrorMessage(cause, t('planning.deliveryRequests.saveError'))
  } finally {
    syncing.value = false
  }
}
const store = useDeliveryRequestStore()
const { formatDateTime, formatDate, optionLabel, formatDecimal } = useListCellFormatters()

/* Counters of the orders the user sees (TRS01-US03): an orderer sees his own only. */
const all = ref<DeliveryRequestApi[]>([])
async function loadCounters() {
  try {
    all.value = (await deliveryRequestService.getAll({ page: 1, pageSize: 500 })).data.items
  } catch {
    all.value = []
  }
}
const counters = computed<{ key: string; value: number; view?: string }[]>(() => [
  {
    key: 'pending',
    view: 'pending',
    value: all.value.filter((row) => row.status === 'pending').length
  },
  {
    key: 'planned',
    view: 'planned',
    value: all.value.filter((row) => row.status === 'planned' && !delivered(row)).length
  },
  {
    key: 'rejected',
    view: 'rejected',
    value: all.value.filter((row) => row.status === 'rejected').length
  },
  { key: 'delivered', value: all.value.filter(delivered).length }
])
function delivered(row: DeliveryRequestApi) {
  return (
    row.followUp === 'delivered' || row.followUp === 'confirmed' || row.followUp === 'contested'
  )
}
onMounted(loadCounters)
watch(() => store.items, loadCounters)

function onOrderCreated(no: string) {
  creatingOrder.value = false
  void store.fetchItems(store.pagination.page, store.pagination.limit)
  void router.push({ path: '/planning/transport-orders', query: { no } })
}

const searchColumnOptions = computed<{ value: DeliveryRequestSearchColumn; label: string }[]>(
  () => [
    {
      value: 'no,ordererName,deliveryPointName,externalReference',
      label: t('planning.deliveryRequests.search.all')
    },
    { value: 'no', label: t('planning.deliveryRequests.col.no') },
    { value: 'ordererName', label: t('planning.deliveryRequests.col.ordererName') },
    { value: 'deliveryPointName', label: t('planning.deliveryRequests.col.deliveryPointName') },
    { value: 'externalReference', label: t('planning.deliveryRequests.col.externalReference') }
  ]
)

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('planning.deliveryRequests.col.no'), minW: '110px', cell: 'link' },
  {
    sortKey: 'desiredDate',
    label: t('planning.deliveryRequests.col.desiredDate'),
    minW: '130px',
    formatter: formatDate
  },
  {
    sortKey: 'validUntil',
    label: t('planning.deliveryRequests.col.validUntil'),
    minW: '130px',
    defaultHidden: true,
    formatter: formatDate
  },
  {
    sortKey: 'externalReference',
    label: circuit.value.externalReferenceLabel,
    minW: '150px'
  },
  {
    sortKey: 'kind',
    label: t('planning.deliveryRequests.col.kind'),
    minW: '150px',
    formatter: optionLabel('deliveryRequestKind')
  },
  {
    sortKey: 'origin',
    label: t('planning.deliveryRequests.col.origin'),
    minW: '170px',
    defaultHidden: true,
    formatter: optionLabel('deliveryRequestOrigin')
  },
  {
    sortKey: 'pickupPointName',
    label: t('planning.deliveryRequests.col.pickupPointName'),
    minW: '180px',
    defaultHidden: true
  },
  {
    sortKey: 'content',
    label: t('planning.deliveryRequests.col.content'),
    minW: '200px',
    defaultHidden: true
  },
  {
    sortKey: 'freightPayer',
    label: t('planning.deliveryRequests.col.freightPayer'),
    minW: '140px',
    defaultHidden: true,
    formatter: optionLabel('freightPayer')
  },
  {
    sortKey: 'quantity',
    label: t('planning.deliveryRequests.col.quantity'),
    minW: '110px',
    align: 'right',
    // Quantities in different units do not add up: the line count is shown instead.
    formatter: (value, item) => {
      const row = item as unknown as DeliveryRequestApi
      return row.lineCount > 1 && !row.unit
        ? t('planning.deliveryRequests.lines.count', row.lineCount)
        : formatDecimal(value, item)
    }
  },
  {
    sortKey: 'weightKg',
    label: t('planning.deliveryRequests.col.weightKg'),
    minW: '110px',
    align: 'right',
    defaultHidden: true,
    formatter: formatDecimal
  },
  {
    sortKey: 'status',
    label: t('planning.deliveryRequests.col.status'),
    minW: '130px',
    formatter: optionLabel('deliveryRequestStatus')
  },
  {
    sortKey: 'followUp',
    label: t('planning.deliveryRequests.col.followUp'),
    minW: '220px',
    formatter: (value, item) => {
      const row = item as DeliveryRequestApi
      if (!value) return ''
      const state = t(`planning.deliveryRequests.followUp.${String(value)}`)
      return value === 'planned'
        ? `${state} · ${row.transportOrderNo} · ${formatDate(row.plannedOn, row)}${row.vehiclePlate ? ` · ${row.vehiclePlate}` : ''}`
        : state
    }
  },
  { sortKey: 'ordererName', label: t('planning.deliveryRequests.col.ordererName'), minW: '200px' },
  {
    sortKey: 'deliveryPointName',
    label: t('planning.deliveryRequests.col.deliveryPointName'),
    minW: '220px'
  },
  {
    sortKey: 'recipientName',
    label: t('planning.deliveryRequests.col.recipientName'),
    minW: '200px',
    defaultHidden: true
  },
  { sortKey: 'productName', label: t('planning.deliveryRequests.col.productName'), minW: '200px' },
  {
    sortKey: 'lineCount',
    label: t('planning.deliveryRequests.col.lineCount'),
    minW: '80px',
    align: 'right'
  },
  { sortKey: 'unit', label: t('planning.deliveryRequests.col.unit'), minW: '90px' },
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
    labelKey: 'planning.deliveryRequests.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'deliveryRequestStatus'
  },
  {
    field: 'kind',
    labelKey: 'planning.deliveryRequests.col.kind',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'deliveryRequestKind'
  },
  {
    field: 'origin',
    labelKey: 'planning.deliveryRequests.col.origin',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'deliveryRequestOrigin'
  },
  {
    field: 'freightPayer',
    labelKey: 'planning.deliveryRequests.col.freightPayer',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'freightPayer'
  }
]

const detailKeys = [
  'status',
  'ordererName',
  'deliveryPointName',
  'productName',
  'quantity',
  'desiredDate'
]
const detailColumns = computed(() =>
  detailKeys
    .map((key) => tableColumns.value.find((column) => column.sortKey === key))
    .filter((column): column is TableColumn => !!column)
)

function detailValue(item: DeliveryRequestApi, column: TableColumn): string {
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
} = useListPage<DeliveryRequestApi, DeliveryRequestSearchColumn>({
  tableId: 'planning-delivery-requests',
  feature: 'DELIVERYREQUEST',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'delivery-requests',
  exportApi: deliveryRequestApi.exportExcel
})

/* The status views of the list, in the view selector of the toolbar, in sync with the filter. */
const STATUS_VIEWS = ['pending', 'planned', 'expired', 'rejected', 'cancelled'] as const
const listViewOptions = computed(() => [
  { value: 'all', label: t('planning.deliveryRequests.view.all') },
  ...STATUS_VIEWS.map((status) => ({
    value: status,
    label: t(`planning.deliveryRequests.view.${status}`)
  }))
])
const listView = computed(
  () =>
    (store.userFilters.find((filter) => filter.field === 'status')?.value as string | undefined) ??
    'all'
)
function setListView(value: string) {
  const others = store.userFilters.filter((filter) => filter.field !== 'status')
  onUpdateUserFilters(
    value === 'all' ? others : [...others, { field: 'status', valueType: 'string', value }]
  )
}

/* The planner's main gesture here is to turn the waiting orders into a transport order; the
 * orderer's is to place an order. The other ways in wait in « Plus d'actions ». */
const orderFirst = computed(() => canCreateOrder.value)
const moreActions = computed<MoreAction[]>(() => [
  {
    key: 'new',
    label: t('planning.deliveryRequests.action.new'),
    icon: Plus,
    hidden: !orderFirst.value || !canInsert.value || !entryOpen.value,
    onSelect: openCreateModal
  },
  {
    key: 'import',
    label: t('planning.deliveryRequests.import.actionLong'),
    icon: Upload,
    hidden: !canInsert.value || !circuit.value.intake.fileImport,
    onSelect: () => (importing.value = true)
  },
  {
    key: 'sync',
    label: t('planning.deliveryRequests.intake.sync'),
    icon: RefreshCw,
    hidden: !canReceive.value || !circuit.value.intake.erpConnector,
    disabled: syncing.value,
    onSelect: () => void syncConnector()
  },
  {
    key: 'api',
    label: t('planning.deliveryRequests.intake.api'),
    icon: Cable,
    hidden: !canReceive.value || !circuit.value.intake.ordererApi,
    onSelect: () => (showingApi.value = true)
  }
])
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('planning.deliveryRequests.title')"
        :exporting="exporting"
        :show-filter-panel="showFilterPanel"
        :applied-filter-count="appliedFilterCount"
        :show-export-excel="canExport"
        :export-excel="exportToExcel"
        :show-details-panel="showDetailsPanel"
        :show-create="!orderFirst && canInsert && entryOpen"
        :show-card-actions="showCardActions"
        :can-view-selected="canViewSelected"
        :can-edit-selected="canEditSelected"
        :list-view-options="listViewOptions"
        :list-view="listView"
        :more-actions="moreActions"
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
        @update:list-view="setListView"
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
        <template v-if="orderFirst" #extra-actions>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition"
            @click="creatingOrder = true"
          >
            <Truck class="w-4 h-4" />
            {{ t('planning.transportOrders.action.createFromRequests') }}
          </button>
        </template>
      </ListPageToolbar>

      <FormAlerts class="mx-4" :error="exportError" @clear:error="exportError = null" />
      <FormAlerts
        class="mx-4"
        :error="syncError"
        :success="syncMessage"
        @clear:error="syncError = null"
        @clear:success="syncMessage = null"
      />
      <p v-if="canInsert && !entryOpen" class="mx-4 mb-1 text-xs text-muted-foreground">
        {{
          isOrderer
            ? t('planning.deliveryRequests.intake.serviceClosed')
            : t('planning.deliveryRequests.intake.manualClosed')
        }}
      </p>

      <div class="mx-4 my-1.5 flex flex-wrap gap-2" data-testid="request-counters">
        <component
          :is="counter.view ? 'button' : 'span'"
          v-for="counter in counters"
          :key="counter.key"
          :type="counter.view ? 'button' : undefined"
          class="inline-flex items-center gap-2 rounded border px-3 py-1 text-sm"
          :class="[
            counter.view && listView === counter.view
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card',
            counter.view ? 'cursor-pointer hover:bg-accent' : '',
            counter.value ? '' : 'opacity-60'
          ]"
          :aria-pressed="counter.view ? listView === counter.view : undefined"
          @click="counter.view && setListView(listView === counter.view ? 'all' : counter.view)"
        >
          <span class="text-muted-foreground">{{
            t(`planning.deliveryRequests.counter.${counter.key}`)
          }}</span>
          <span
            class="font-semibold tabular-nums"
            :class="counter.value ? 'text-card-foreground' : 'text-muted-foreground'"
            >{{ counter.value }}</span
          >
        </component>
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
        :loading-text="t('planning.deliveryRequests.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="
          !orderFirst && canInsert && entryOpen
            ? t('planning.deliveryRequests.noResultsCreate')
            : t('planning.deliveryRequests.noResults')
        "
        :no-search-results-message="
          t('planning.deliveryRequests.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as DeliveryRequestApi)"
        @row-dblclick="(item) => openFromList((item as DeliveryRequestApi).no)"
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
                    {{ t('planning.deliveryRequests.col.deliveryPointName') }}
                  </p>
                  <p class="font-semibold text-primary">
                    {{ store.selectedItem.deliveryPointName }}
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

    <DeliveryRequestCard
      v-if="showCard && cardNo"
      :key="`${cardNo}-${cardOpenMode}`"
      :delivery-request-no="cardNo"
      :initial-open-mode="cardOpenMode"
      :show-create-success="showCreateSuccess"
      @close="closeCard"
      @create="createFromCard"
    />
    <DeliveryRequestCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
    <OrdererApiDialog
      :open="showingApi"
      @close="showingApi = false"
      @sent="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
    <RequestImportDialog
      :open="importing"
      @close="importing = false"
      @imported="store.fetchItems(store.pagination.page, store.pagination.limit)"
    />
    <CreateTransportOrderDialog
      :open="creatingOrder"
      @close="creatingOrder = false"
      @created="onOrderCreated"
    />
  </div>
</template>
