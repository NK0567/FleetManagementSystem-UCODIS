<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Archive, BadgeCheck, BadgeX, UserCog } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import EmployeeForm from '../components/EmployeeForm.vue'
import {
  MANUAL_EMPLOYEE_STATUSES,
  statusNeedsReason,
  type ManualEmployeeStatus
} from '../domain/employee'
import { employeeService } from '../services/employeeService'
import { useEmployeeStore } from '../stores/employeeStore'
import type { EmployeeApi } from '../types/employee.types'

const props = defineProps<{
  employeeNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useEmployeeStore()
const { canUpdate, canInsert, canExecute } = usePermissions('EMPLOYEE')
const formRef = ref<InstanceType<typeof EmployeeForm> | null>(null)

const isArchived = computed(() => store.currentItem?.status === 'archived')
const canEdit = computed(() => canUpdate.value && !isArchived.value)

const {
  item,
  isLoading,
  errorMsg,
  isEditMode,
  isSaving,
  saveError,
  saveSuccess,
  validationErrors,
  isFormDirty,
  hasPrev,
  hasNext,
  sidebarItems,
  enterEditMode,
  cancelEdit,
  saveItem,
  goTo,
  goToPrev,
  goToNext
} = useEntityCard({
  no: () => props.employeeNo,
  store,
  form: formRef,
  update: employeeService.update,
  canUpdate: canEdit,
  label: (employee) => employee.fullName,
  saveErrorFallback: t('hr.employees.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.fullName}` : t('hr.employees.card')
)

const canAct = computed(() => canExecute.value && !isArchived.value && !isFormDirty.value)

const acting = ref(false)

/** Applies an action, then refreshes the card and the list with the record the server returns. */
async function runAction(action: () => Promise<EmployeeApi>): Promise<boolean> {
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('hr.employees.actionError'))
    return false
  } finally {
    acting.value = false
  }
}

const showStatusDialog = ref(false)
const nextStatus = ref<ManualEmployeeStatus>('active')
const statusReason = ref('')
const statusChoices = computed(() =>
  MANUAL_EMPLOYEE_STATUSES.filter((status) => status !== item.value?.status)
)
const statusReasonMissing = computed(
  () => statusNeedsReason(nextStatus.value) && !statusReason.value.trim()
)

function openStatusDialog() {
  nextStatus.value = statusChoices.value[0] ?? 'active'
  statusReason.value = ''
  showStatusDialog.value = true
}

async function confirmStatus() {
  if (!item.value || statusReasonMissing.value) return
  const no = item.value.no
  if (await runAction(() => employeeService.setStatus(no, nextStatus.value, statusReason.value))) {
    showStatusDialog.value = false
  }
}

const showArchiveDialog = ref(false)
const archiveReason = ref('')

function openArchiveDialog() {
  archiveReason.value = ''
  showArchiveDialog.value = true
}

async function confirmArchive() {
  if (!item.value) return
  const no = item.value.no
  if (await runAction(() => employeeService.archive(no, archiveReason.value))) {
    showArchiveDialog.value = false
  }
}

async function toggleDrivingAuthorization() {
  if (!item.value) return
  const { no, drivingAuthorized } = item.value
  await runAction(() => employeeService.setDrivingAuthorization(no, !drivingAuthorized))
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('hr.employees.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || acting"
    :actions-disabled="isLoading || isSaving || acting"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('hr.employees.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canEdit"
    :show-title-new-button="canInsert"
    :has-unsaved-changes="isFormDirty"
    :can-save="isFormDirty"
    @close="emit('close')"
    @save="saveItem"
    @enter-edit="enterEditMode"
    @cancel-edit="cancelEdit"
    @go-prev="goToPrev"
    @go-next="goToNext"
    @select-sidebar="goTo"
    @create="emit('create')"
    @clear-save-error="saveError = null"
  >
    <template #title-badges>
      <EmployeeStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="canAct" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="openStatusDialog"
      >
        <UserCog class="w-5 h-5 text-primary" /> {{ t('hr.employees.action.changeStatus') }}
      </button>
      <button
        v-if="item?.drives"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="toggleDrivingAuthorization"
      >
        <template v-if="item.drivingAuthorized">
          <BadgeX class="w-5 h-5 text-primary" /> {{ t('hr.employees.action.withdrawDriving') }}
        </template>
        <template v-else>
          <BadgeCheck class="w-5 h-5 text-primary" />
          {{ t('hr.employees.action.authorizeDriving') }}
        </template>
      </button>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="openArchiveDialog"
      >
        <Archive class="w-5 h-5 text-primary" /> {{ t('hr.employees.action.archive') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving || acting"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <EmployeeForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ConfirmDialog
    :open="showStatusDialog"
    :title="t('hr.employees.action.changeStatus')"
    :confirm-label="t('common.confirm')"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="confirmStatus"
    @cancel="showStatusDialog = false"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('hr.employees.form.status')">
        <OptionsSelect
          :model-value="nextStatus"
          options-key="employeeStatus"
          :hidden-values="['archived', ...(item ? [item.status] : [])]"
          @update:model-value="nextStatus = $event as ManualEmployeeStatus"
        />
      </BaseFormField>
      <BaseFormField
        :label="t('hr.employees.form.statusReason')"
        :required="statusNeedsReason(nextStatus)"
      >
        <FormTextarea
          v-model="statusReason"
          :rows="3"
          :maxlength="300"
          :invalid="statusReasonMissing"
        />
      </BaseFormField>
    </div>
  </ConfirmDialog>

  <ConfirmDialog
    :open="showArchiveDialog"
    :title="t('hr.employees.action.archive')"
    :confirm-label="t('hr.employees.action.archive')"
    :loading="acting"
    destructive
    panel-class="max-w-md"
    @confirm="confirmArchive"
    @cancel="showArchiveDialog = false"
  >
    <div class="space-y-3">
      <p class="text-sm text-muted-foreground">
        {{ t('hr.employees.archiveWarning', { name: item?.fullName ?? '' }) }}
      </p>
      <BaseFormField :label="t('hr.employees.form.statusReason')">
        <FormTextarea v-model="archiveReason" :rows="3" :maxlength="300" />
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
