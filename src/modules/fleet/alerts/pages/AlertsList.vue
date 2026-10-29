<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { usePermissions } from '@/composables/usePermissions'
import { formatDateTime } from '@/utils/format'
import { alertApi } from '../api/alertApi'
import { alertService } from '../services/alertService'
import { useAlertStore, type AlertListView } from '../stores/alertStore'
import type { AlertApi, AlertSearchColumn } from '../types/alert.types'

const { t } = useI18n()
const router = useRouter()
const store = useAlertStore()
const { canUpdate } = usePermissions('ALERT')
const { optionLabel, booleanLabel, formatDateTime: formatDateTimeCell } = useListCellFormatters()

const listViewOptions = computed<{ value: AlertListView; label: string }[]>(() => [
  { value: 'current', label: t('fleet.alerts.listView.current') },
  { value: 'escalated', label: t('fleet.alerts.listView.escalated') },
  { value: 'history', label: t('fleet.alerts.listView.history') },
  { value: 'all', label: t('fleet.alerts.listView.all') }
])

const searchColumnOptions = computed<{ value: AlertSearchColumn; label: string }[]>(() => [
  { value: 'subject,detail', label: t('fleet.alerts.search.all') },
  { value: 'subject', label: t('fleet.alerts.col.subject') },
  { value: 'detail', label: t('fleet.alerts.col.detail') }
])

const tableColumns = computed<TableColumn[]>(() => [
  {
    sortKey: 'severity',
    label: t('fleet.alerts.col.severity'),
    minW: '120px',
    formatter: optionLabel('alertSeverity')
  },
  {
    sortKey: 'category',
    label: t('fleet.alerts.col.category'),
    minW: '170px',
    formatter: optionLabel('alertCategory')
  },
  { sortKey: 'subject', label: t('fleet.alerts.col.subject'), minW: '180px' },
  { sortKey: 'detail', label: t('fleet.alerts.col.detail'), minW: '260px' },
  {
    sortKey: 'since',
    label: t('fleet.alerts.col.since'),
    minW: '150px',
    formatter: formatDateTimeCell
  },
  {
    sortKey: 'status',
    label: t('fleet.alerts.col.status'),
    minW: '130px',
    formatter: optionLabel('alertStatus')
  },
  {
    sortKey: 'escalated',
    label: t('fleet.alerts.col.escalated'),
    minW: '100px',
    formatter: booleanLabel
  },
  {
    sortKey: 'notifications',
    label: t('fleet.alerts.col.notifications'),
    minW: '220px',
    formatter: (value) =>
      ((value as AlertApi['notifications'] | undefined) ?? [])
        .map((item) => t(`fleet.alerts.notification.${item.channel}`, { to: item.to }))
        .join(' ; ')
  }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'category',
    labelKey: 'fleet.alerts.col.category',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'alertCategory'
  },
  {
    field: 'severity',
    labelKey: 'fleet.alerts.col.severity',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'alertSeverity'
  },
  {
    field: 'status',
    labelKey: 'fleet.alerts.col.status',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'alertStatus'
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
} = useListPage<AlertApi, AlertSearchColumn>({
  tableId: 'fleet-alerts',
  feature: 'ALERT',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'alerts',
  exportApi: alertApi.exportExcel,
  hasCard: false
})

const working = ref(false)
const actionError = ref<string | null>(null)
const handling = ref(false)

async function run(action: () => Promise<AlertApi>) {
  working.value = true
  actionError.value = null
  try {
    store.selectItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    actionError.value = apiErrorMessage(error, t('fleet.alerts.actionError'))
  } finally {
    working.value = false
  }
}

function acknowledge(alert: AlertApi) {
  void run(() => alertService.acknowledge(alert.no))
}

async function handle(comment: string) {
  handling.value = false
  const alert = store.selectedItem
  if (alert) await run(() => alertService.handle(alert.no, comment))
}

function openRecord(alert: AlertApi) {
  void router.push({ path: alert.path, query: { no: alert.recordNo, cardMode: 'view' } })
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('fleet.alerts.title')"
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
        @update:list-view="store.setListView($event as AlertListView)"
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
        :loading-text="t('fleet.alerts.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('fleet.alerts.noResults')"
        :no-search-results-message="t('fleet.alerts.noSearchResults', { query: store.searchQuery })"
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
        @select-item="(item) => store.selectItem(item as AlertApi)"
        @row-dblclick="(item) => (item as AlertApi).path && openRecord(item as AlertApi)"
      >
        <template #cell-severity="{ item }">
          <AlertSeverityPill :severity="(item as AlertApi).severity" />
        </template>
        <template #cell-status="{ item }">
          <AlertStatusPill :status="(item as AlertApi).status" />
        </template>
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as AlertListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="store.selectedItem" :record-no="store.selectedItem.subject">
            <template #details>
              <div class="px-4 py-4 space-y-3 flex-1 overflow-y-auto text-sm">
                <p class="font-semibold text-card-foreground">{{ store.selectedItem.detail }}</p>
                <div class="flex flex-wrap gap-2">
                  <AlertSeverityPill :severity="store.selectedItem.severity" />
                  <AlertStatusPill :status="store.selectedItem.status" />
                </div>
                <p v-if="store.selectedItem.escalated" class="text-destructive">
                  {{
                    t('fleet.alerts.escalatedTo', {
                      profile: optionLabel('userProfile')(
                        store.selectedItem.escalateTo,
                        store.selectedItem
                      )
                    })
                  }}
                </p>
                <p v-if="store.selectedItem.acknowledgedBy" class="text-muted-foreground">
                  {{
                    t('fleet.alerts.acknowledgedBy', {
                      user: store.selectedItem.acknowledgedBy,
                      date: formatDateTime(store.selectedItem.acknowledgedAt)
                    })
                  }}
                </p>
                <p v-if="store.selectedItem.handledBy" class="text-muted-foreground">
                  {{
                    t('fleet.alerts.handledBy', {
                      user: store.selectedItem.handledBy,
                      date: formatDateTime(store.selectedItem.handledAt)
                    })
                  }}
                </p>
                <p v-if="store.selectedItem.comment" class="text-card-foreground">
                  {{ store.selectedItem.comment }}
                </p>
              </div>
            </template>
            <template #footer>
              <button
                v-if="store.selectedItem.path"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                @click="openRecord(store.selectedItem)"
              >
                {{ t('fleet.alerts.action.open') }}
              </button>
              <button
                v-if="canUpdate && store.selectedItem.status === 'new'"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium disabled:opacity-60"
                :disabled="working"
                @click="acknowledge(store.selectedItem)"
              >
                {{ t('fleet.alerts.action.acknowledge') }}
              </button>
              <button
                v-if="
                  canUpdate &&
                  (store.selectedItem.status === 'new' ||
                    store.selectedItem.status === 'acknowledged')
                "
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium disabled:opacity-60"
                :disabled="working"
                @click="handling = true"
              >
                {{ t('fleet.alerts.action.handle') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <ReasonDialog
      :open="handling"
      :title="t('fleet.alerts.action.handle')"
      :label="t('fleet.alerts.form.comment')"
      :confirm-label="t('fleet.alerts.action.handle')"
      :loading="working"
      @confirm="handle"
      @cancel="handling = false"
    />
  </div>
</template>
