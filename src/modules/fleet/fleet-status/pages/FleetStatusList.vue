<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Archive, Mail } from '@lucide/vue'
import { isValidEmailAddress, parseRecipients } from '../domain/fleetStatusDispatch'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { usePermissions } from '@/composables/usePermissions'
import { formatDate, formatDateTime } from '@/utils/format'
import { useFleetStatusStore, type FleetStatusListView } from '../stores/fleetStatusStore'
import type { FleetStatusApi, FleetStatusSearchColumn } from '../types/fleetStatus.types'

const { t } = useI18n()
const store = useFleetStatusStore()
const { canUpdate, canExecute } = usePermissions('FLEETSTATUS')
const { optionLabel, formatDate: formatDateCell } = useListCellFormatters()

const listViewOptions = computed<{ value: FleetStatusListView; label: string }[]>(() => [
  { value: 'operational', label: t('fleet.fleetStatus.listView.operational') },
  { value: 'transit', label: t('fleet.fleetStatus.listView.transit') },
  { value: 'immobilized', label: t('fleet.fleetStatus.listView.immobilized') },
  { value: 'all', label: t('fleet.fleetStatus.listView.all') }
])

const searchColumnOptions = computed<{ value: FleetStatusSearchColumn; label: string }[]>(() => [
  { value: 'no,plate,driverName', label: t('fleet.fleetStatus.search.all') },
  { value: 'plate', label: t('fleet.fleetStatus.col.plate') },
  { value: 'driverName', label: t('fleet.fleetStatus.col.driverName') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'plate', label: t('fleet.fleetStatus.col.plate'), minW: '120px' },
  { sortKey: 'vehicleTypeName', label: t('fleet.fleetStatus.col.vehicleTypeName'), minW: '130px' },
  { sortKey: 'trailerPlate', label: t('fleet.fleetStatus.col.trailerPlate'), minW: '120px' },
  { sortKey: 'driverName', label: t('fleet.fleetStatus.col.driverName'), minW: '190px' },
  {
    sortKey: 'state',
    label: t('fleet.fleetStatus.col.state'),
    minW: '220px',
    formatter: optionLabel('fleetState')
  },
  { sortKey: 'mission', label: t('fleet.fleetStatus.col.mission'), minW: '280px' },
  { sortKey: 'location', label: t('fleet.fleetStatus.col.location'), minW: '180px' },
  { sortKey: 'position', label: t('fleet.fleetStatus.col.position'), minW: '180px' },
  {
    sortKey: 'immobilizationReason',
    label: t('fleet.fleetStatus.col.immobilizationReason'),
    minW: '240px'
  },
  {
    sortKey: 'expectedBackOn',
    label: t('fleet.fleetStatus.col.expectedBackOn'),
    minW: '150px',
    formatter: formatDateCell
  },
  { sortKey: 'observation', label: t('fleet.fleetStatus.col.observation'), minW: '260px' },
  { sortKey: 'no', label: t('fleet.fleetStatus.col.no'), minW: '100px', defaultHidden: true }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'state',
    labelKey: 'fleet.fleetStatus.col.state',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'fleetState'
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
} = useListPage<FleetStatusApi, FleetStatusSearchColumn>({
  tableId: 'fleet-fleet-status',
  feature: 'FLEETSTATUS',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'fleet-status',
  exportApi: (body) => store.exportExcel(body),
  hasCard: false
})

const dayOptions = computed(() =>
  store.days.map((entry) => ({
    value: entry.date,
    label: entry.live
      ? t('fleet.fleetStatus.today', { date: formatDate(entry.date) })
      : formatDate(entry.date)
  }))
)

const actionError = ref<string | null>(null)
const archiving = ref(false)

async function archiveToday() {
  archiving.value = true
  actionError.value = null
  try {
    await store.archive()
  } catch (cause) {
    actionError.value = apiErrorMessage(cause, t('fleet.fleetStatus.archiveError'))
  } finally {
    archiving.value = false
  }
}

/** The note of the day, edited in the details panel of the selected line. */
const observation = ref('')
const expectedBackOn = ref<string | null>(null)
const savingNote = ref(false)
watch(
  () => store.selectedItem,
  (line) => {
    observation.value = line?.observation ?? ''
    expectedBackOn.value = line?.expectedBackOn ?? null
  },
  { immediate: true }
)

async function saveNote() {
  const line = store.selectedItem
  if (!line) return
  savingNote.value = true
  actionError.value = null
  try {
    await store.saveNote(line.no, observation.value, expectedBackOn.value)
  } catch (cause) {
    actionError.value = apiErrorMessage(cause, t('fleet.fleetStatus.noteError'))
  } finally {
    savingNote.value = false
  }
}

/* Sending by e-mail: there is no mail server in the demonstration, the sending is recorded. */
const sendOpen = ref(false)
const recipientsText = ref('')
const sending = ref(false)
const sendError = ref<string | null>(null)
const sentMessage = ref<string | null>(null)
const recipients = computed(() => parseRecipients(recipientsText.value))
const invalidRecipient = computed(
  () => recipients.value.find((email) => !isValidEmailAddress(email)) ?? null
)

async function openSend() {
  sendError.value = null
  sendOpen.value = true
  try {
    await store.fetchDispatches()
  } catch {
    /* the list of sendings is a help, the dialog works without it */
  }
  recipientsText.value = store.dispatches[0]?.recipients.join(', ') ?? ''
}

async function send() {
  if (!recipients.value.length || invalidRecipient.value) return
  sending.value = true
  sendError.value = null
  try {
    await store.send(recipients.value)
    sentMessage.value = t('fleet.fleetStatus.send.done', {
      recipients: recipients.value.join(', ')
    })
    sendOpen.value = false
  } catch (cause) {
    sendError.value = apiErrorMessage(cause, t('fleet.fleetStatus.send.error'))
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  void store.fetchDays()
  void store.fetchDispatches().catch(() => undefined)
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.fleetStatus.title')"
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
        @update:list-view="store.setListView($event as FleetStatusListView)"
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
        <template #extra-actions>
          <div class="flex items-center gap-2 ml-1">
            <div class="w-52">
              <select
                :value="store.day"
                class="w-full h-9 px-2 border border-border rounded text-sm bg-card"
                :aria-label="t('fleet.fleetStatus.day')"
                @change="store.setDay(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="option in dayOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <button
              v-if="canExecute && store.isLive"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition disabled:opacity-50"
              :disabled="archiving"
              @click="archiveToday"
            >
              <Archive class="w-4 h-4 text-primary" /> {{ t('fleet.fleetStatus.archive') }}
            </button>
            <button
              v-if="canExecute"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition disabled:opacity-50"
              :disabled="sending"
              @click="openSend"
            >
              <Mail class="w-4 h-4 text-primary" /> {{ t('fleet.fleetStatus.send.button') }}
            </button>
          </div>
        </template>
      </ListPageToolbar>

      <p v-if="store.currentDay?.archivedAt" class="mx-4 mt-2 text-xs text-muted-foreground">
        {{
          t('fleet.fleetStatus.archivedAt', {
            date: formatDateTime(store.currentDay.archivedAt),
            user: store.currentDay.archivedBy ?? ''
          })
        }}
      </p>
      <p v-if="!store.isLive" class="mx-4 mt-1 text-xs text-muted-foreground">
        {{ t('fleet.fleetStatus.readOnlyDay') }}
      </p>
      <p v-if="sentMessage" class="mx-4 mt-1 text-xs text-primary">{{ sentMessage }}</p>
      <p v-else-if="store.dispatches[0]" class="mx-4 mt-1 text-xs text-muted-foreground">
        {{
          t('fleet.fleetStatus.send.last', {
            date: formatDateTime(store.dispatches[0].sentAt),
            day: formatDate(store.dispatches[0].date),
            recipients: store.dispatches[0].recipients.join(', ')
          })
        }}
      </p>

      <FormAlerts
        class="mx-4"
        :error="actionError ?? exportError"
        @clear:error="actionError = exportError = null"
      />

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
        :loading-text="t('fleet.fleetStatus.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.fleetStatus.noResults')"
        :no-search-results-message="
          t('fleet.fleetStatus.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as FleetStatusApi)"
      >
        <template #cell-state="{ item }">
          <FleetStatePill :state="(item as FleetStatusApi).state" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as FleetStatusListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.plate">
            <template #details>
              <div class="px-4 py-4 space-y-4 flex-1 overflow-y-auto text-sm">
                <div>
                  <FleetStatePill :state="store.selectedItem.state" />
                  <p class="text-card-foreground mt-2">{{ store.selectedItem.mission }}</p>
                  <p
                    v-if="store.selectedItem.immobilizationReason"
                    class="text-muted-foreground mt-1"
                  >
                    {{ store.selectedItem.immobilizationReason }}
                  </p>
                </div>
                <div class="space-y-2">
                  <label class="block text-xs font-semibold text-muted-foreground">
                    {{ t('fleet.fleetStatus.col.observation') }}
                  </label>
                  <FormTextarea
                    v-model="observation"
                    :rows="4"
                    :maxlength="500"
                    :disabled="!store.isLive || !canUpdate"
                  />
                  <label class="block text-xs font-semibold text-muted-foreground">
                    {{ t('fleet.fleetStatus.col.expectedBackOn') }}
                  </label>
                  <DateFormInput v-model="expectedBackOn" :disabled="!store.isLive || !canUpdate" />
                </div>
              </div>
            </template>
            <template #footer>
              <button
                v-if="store.isLive && canUpdate"
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium disabled:opacity-50"
                :disabled="savingNote"
                @click="saveNote"
              >
                {{ t('fleet.fleetStatus.saveNote') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <ConfirmDialog
      :open="sendOpen"
      :title="t('fleet.fleetStatus.send.title', { day: formatDate(store.day) })"
      :confirm-label="t('fleet.fleetStatus.send.confirm')"
      :confirm-disabled="!recipients.length || !!invalidRecipient"
      :loading="sending"
      panel-class="max-w-lg"
      @confirm="send"
      @cancel="sendOpen = false"
    >
      <div class="space-y-3 text-sm">
        <p class="text-muted-foreground">{{ t('fleet.fleetStatus.send.hint') }}</p>
        <BaseFormField :label="t('fleet.fleetStatus.send.recipients')" required>
          <FormInput
            v-model="recipientsText"
            :invalid="!!invalidRecipient"
            :placeholder="t('fleet.fleetStatus.send.placeholder')"
          />
          <p v-if="invalidRecipient" class="text-xs text-destructive mt-1">
            {{ t('fleet.fleetStatus.send.invalid', { email: invalidRecipient }) }}
          </p>
        </BaseFormField>
        <p class="text-xs text-muted-foreground">{{ t('fleet.fleetStatus.send.simulated') }}</p>
        <FormAlerts :error="sendError" @clear:error="sendError = null" />
        <div v-if="store.dispatches.length">
          <p class="text-xs font-semibold text-muted-foreground mb-1">
            {{ t('fleet.fleetStatus.send.history') }}
          </p>
          <ul class="space-y-1 text-xs text-muted-foreground max-h-40 overflow-y-auto">
            <li v-for="dispatch in store.dispatches" :key="dispatch.no">
              {{
                t('fleet.fleetStatus.send.line', {
                  date: formatDateTime(dispatch.sentAt),
                  day: formatDate(dispatch.date),
                  count: dispatch.lineCount,
                  recipients: dispatch.recipients.join(', '),
                  user: dispatch.sentBy
                })
              }}
            </li>
          </ul>
        </div>
      </div>
    </ConfirmDialog>
  </div>
</template>
