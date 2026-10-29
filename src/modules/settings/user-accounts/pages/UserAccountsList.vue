<script lang="ts" setup>
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { useListPage } from '@/composables/useListPage'
import { usePermissions } from '@/composables/usePermissions'
import { useOptionsStore } from '@/stores/optionsStore'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/format'
import { userAccountApi } from '../api/userAccountApi'
import { userAccountService } from '../services/userAccountService'
import { useUserAccountStore, type UserAccountListView } from '../stores/userAccountStore'
import type { UserAccountApi, UserAccountSearchColumn } from '../types/userAccount.types'

const { t } = useI18n()
const store = useUserAccountStore()
const optionsStore = useOptionsStore()
const userStore = useUserStore()
const { canInsert, canUpdate, canExecute } = usePermissions('USERACCOUNT')
const { formatDateTime: formatDateTimeCell, booleanLabel, optionLabel } = useListCellFormatters()

const listViewOptions = computed<{ value: UserAccountListView; label: string }[]>(() => [
  { value: 'active', label: t('settings.userAccounts.listView.active') },
  { value: 'disabled', label: t('settings.userAccounts.listView.disabled') },
  { value: 'all', label: t('settings.userAccounts.listView.all') }
])

const searchColumnOptions = computed<{ value: UserAccountSearchColumn; label: string }[]>(() => [
  { value: 'no,name,email', label: t('settings.userAccounts.search.all') },
  { value: 'no', label: t('settings.userAccounts.col.no') },
  { value: 'name', label: t('settings.userAccounts.col.name') },
  { value: 'email', label: t('settings.userAccounts.col.email') }
])

const tableColumns = computed<TableColumn[]>(() => [
  { sortKey: 'no', label: t('settings.userAccounts.col.no'), minW: '110px' },
  { sortKey: 'name', label: t('settings.userAccounts.col.name'), minW: '220px' },
  {
    sortKey: 'profile',
    label: t('settings.userAccounts.col.profile'),
    minW: '200px',
    formatter: optionLabel('userProfile')
  },
  { sortKey: 'orgUnitName', label: t('settings.userAccounts.col.orgUnitName'), minW: '160px' },
  { sortKey: 'email', label: t('settings.userAccounts.col.email'), minW: '200px' },
  {
    sortKey: 'lastLoginAt',
    label: t('settings.userAccounts.col.lastLoginAt'),
    minW: '150px',
    formatter: formatDateTimeCell
  },
  {
    sortKey: 'active',
    label: t('settings.userAccounts.col.active'),
    minW: '90px',
    formatter: booleanLabel
  },
  {
    sortKey: 'statusChangedAt',
    label: t('settings.userAccounts.col.statusChangedAt'),
    minW: '150px',
    defaultHidden: true,
    formatter: formatDateTimeCell
  },
  { sortKey: 'employeeNo', label: t('settings.userAccounts.col.employeeNo'), minW: '110px' }
])

const filterDefs: FilterFieldDef[] = [
  {
    field: 'profile',
    labelKey: 'settings.userAccounts.col.profile',
    valueType: 'string',
    kind: 'option',
    optionsKey: 'userProfile'
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
} = useListPage<UserAccountApi, UserAccountSearchColumn>({
  tableId: 'settings-user-accounts',
  feature: 'USERACCOUNT',
  store,
  columns: tableColumns,
  filterDefs,
  exportFileBaseName: 'user-accounts',
  exportApi: userAccountApi.exportExcel,
  hasCard: false
})

const selected = computed(() => store.selectedItem)
const profiles = computed(() => optionsStore.getOptions('userProfile'))
const isSelf = computed(() => selected.value?.no === userStore.user?.code)

type Dialog = 'create' | 'edit' | 'disable' | 'enable' | null
const dialog = ref<Dialog>(null)
const working = ref(false)
const actionError = ref<string | null>(null)
const form = reactive({
  no: '',
  name: '',
  email: '',
  profile: '',
  employeeNo: null as string | null,
  language: 'fr',
  reason: ''
})

function open(kind: Exclude<Dialog, null>) {
  const account = kind === 'create' ? null : selected.value
  form.no = account?.no ?? ''
  form.name = account?.name ?? ''
  form.email = account?.email ?? ''
  form.profile = account?.profile ?? ''
  form.employeeNo = account?.employeeNo ?? null
  form.language = account?.language ?? 'fr'
  form.reason = ''
  actionError.value = null
  dialog.value = kind
}

const confirmDisabled = computed(() => {
  if (dialog.value === 'create') return !form.no.trim() || !form.name.trim() || !form.profile
  if (dialog.value === 'edit') return !form.name.trim() || !form.profile
  if (dialog.value === 'disable') return !form.reason.trim()
  return false
})

async function refresh(no: string) {
  await store.fetchItems(store.pagination.page, store.pagination.limit)
  store.selectItem(store.items.find((item) => item.no === no) ?? null)
}

async function confirm() {
  const kind = dialog.value
  const account = selected.value
  working.value = true
  actionError.value = null
  try {
    const fields = {
      name: form.name,
      email: form.email,
      profile: form.profile,
      employeeNo: form.employeeNo ?? '',
      language: form.language
    }
    let no = account?.no ?? ''
    if (kind === 'create') no = (await userAccountService.create({ no: form.no, ...fields })).no
    else if (kind === 'edit' && account) await userAccountService.update(account.no, fields)
    else if (kind === 'disable' && account)
      await userAccountService.disable(account.no, form.reason)
    else if (kind === 'enable' && account) await userAccountService.enable(account.no)
    dialog.value = null
    await refresh(no)
  } catch (error) {
    actionError.value = apiErrorMessage(error, t('settings.userAccounts.actionError'))
  } finally {
    working.value = false
  }
}

const dialogTitle = computed(() =>
  dialog.value ? t(`settings.userAccounts.action.${dialog.value}`) : ''
)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <template v-if="!hideListContent">
      <ListPageToolbar
        :title="t('settings.userAccounts.title')"
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
        @update:list-view="store.setListView($event as UserAccountListView)"
        @toggle-filter="showFilterPanel = !showFilterPanel"
        @toggle-details="showDetailsPanel = !showDetailsPanel"
        @create="open('create')"
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
      <FormAlerts
        v-if="!dialog"
        class="mx-4"
        :error="actionError"
        @clear:error="actionError = null"
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
        :loading-text="t('settings.userAccounts.loadingList')"
        :items="store.items"
        row-key="no"
        :selected-item="store.selectedItem"
        :error="store.error"
        :search-query="store.searchQuery"
        :no-results-message="t('settings.userAccounts.noResults')"
        :no-search-results-message="
          t('settings.userAccounts.noSearchResults', { query: store.searchQuery })
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
        @select-item="(item) => store.selectItem(item as UserAccountApi)"
      >
        <template #filter-panel>
          <AdvancedFilterPanel
            :fields="filterFields"
            :model-value="store.userFilters"
            :list-view-options="listViewOptions"
            :list-view="store.listView"
            @update:model-value="onUpdateUserFilters"
            @update:list-view="store.setListView($event as UserAccountListView)"
          />
        </template>
        <template #details-panel>
          <ListDetailsPanel v-if="selected" :record-no="selected.no">
            <template #details>
              <div class="px-4 py-4 space-y-2 flex-1 overflow-y-auto text-sm">
                <p class="font-semibold text-primary">{{ selected.name }}</p>
                <p class="text-card-foreground">
                  {{ optionsStore.getOptionLabel('userProfile', selected.profile) }}
                </p>
                <p class="text-muted-foreground">{{ selected.orgUnitName }}</p>
                <p v-if="selected.lastLoginAt" class="text-muted-foreground">
                  {{
                    t('settings.userAccounts.lastLogin', {
                      at: formatDateTime(selected.lastLoginAt)
                    })
                  }}
                </p>
                <p v-if="!selected.active" class="text-destructive">
                  {{
                    t('settings.userAccounts.disabledSince', {
                      at: formatDateTime(selected.statusChangedAt),
                      by: selected.statusChangedBy ?? '-'
                    })
                  }}
                </p>
              </div>
            </template>
            <template #footer>
              <button
                v-if="canUpdate"
                type="button"
                class="flex-1 px-3 py-2 border border-border text-card-foreground text-sm rounded hover:bg-accent transition font-medium"
                @click="open('edit')"
              >
                {{ t('settings.userAccounts.action.edit') }}
              </button>
              <button
                v-if="canExecute && selected.active && !isSelf"
                type="button"
                class="flex-1 px-3 py-2 border border-destructive text-destructive text-sm rounded hover:bg-destructive/10 transition font-medium"
                @click="open('disable')"
              >
                {{ t('settings.userAccounts.action.disable') }}
              </button>
              <button
                v-if="canExecute && !selected.active"
                type="button"
                class="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium"
                @click="open('enable')"
              >
                {{ t('settings.userAccounts.action.enable') }}
              </button>
            </template>
          </ListDetailsPanel>
        </template>
      </ListPageLayout>
    </template>

    <ConfirmDialog
      :open="!!dialog"
      :title="dialogTitle"
      :confirm-label="dialogTitle"
      :confirm-disabled="confirmDisabled"
      :destructive="dialog === 'disable'"
      :loading="working"
      panel-class="max-w-md"
      @confirm="confirm"
      @cancel="dialog = null"
    >
      <div class="space-y-3">
        <FormAlerts :error="actionError" @clear:error="actionError = null" />
        <template v-if="dialog === 'create' || dialog === 'edit'">
          <BaseFormField
            v-if="dialog === 'create'"
            :label="t('settings.userAccounts.col.no')"
            required
          >
            <FormInput v-model="form.no" :maxlength="20" />
          </BaseFormField>
          <BaseFormField :label="t('settings.userAccounts.col.name')" required>
            <FormInput v-model="form.name" :maxlength="80" />
          </BaseFormField>
          <BaseFormField :label="t('settings.userAccounts.col.profile')" required>
            <select
              v-model="form.profile"
              class="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
            >
              <option value="" disabled>{{ t('settings.userAccounts.pickProfile') }}</option>
              <option
                v-for="option in profiles"
                :key="String(option.value)"
                :value="String(option.value)"
              >
                {{ option.description }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('settings.userAccounts.col.employeeNo')">
            <ReferenceLookup
              v-model="form.employeeNo"
              reference-key="employees"
              :modal-title="t('settings.userAccounts.col.employeeNo')"
            />
          </BaseFormField>
          <BaseFormField :label="t('settings.userAccounts.col.email')">
            <FormInput v-model="form.email" type="email" :maxlength="120" />
          </BaseFormField>
          <p v-if="dialog === 'create'" class="text-xs text-muted-foreground">
            {{ t('settings.userAccounts.demoPassword') }}
          </p>
        </template>
        <template v-else-if="dialog === 'disable'">
          <p class="text-sm text-muted-foreground">{{ selected?.no }} · {{ selected?.name }}</p>
          <BaseFormField :label="t('settings.userAccounts.reason')" required>
            <FormInput v-model="form.reason" :maxlength="200" />
          </BaseFormField>
        </template>
        <p v-else-if="dialog === 'enable'" class="text-sm text-muted-foreground">
          {{ selected?.no }} · {{ selected?.name }}
        </p>
      </div>
    </ConfirmDialog>
  </div>
</template>
