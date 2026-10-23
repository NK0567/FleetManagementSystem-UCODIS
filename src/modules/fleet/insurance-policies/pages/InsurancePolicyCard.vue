<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileX } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { todayIso } from '@/utils/date'
import InsurancePolicyForm from '../components/InsurancePolicyForm.vue'
import { insurancePolicyService } from '../services/insurancePolicyService'
import { useInsurancePolicyStore } from '../stores/insurancePolicyStore'

const props = defineProps<{
  insurancePolicyNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useInsurancePolicyStore()
const { canUpdate, canInsert } = usePermissions('INSURANCEPOLICY')
/** A terminated policy stays as it was signed. */
const canEdit = computed(() => canUpdate.value && !store.currentItem?.terminatedOn)
const formRef = ref<InstanceType<typeof InsurancePolicyForm> | null>(null)

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
  no: () => props.insurancePolicyNo,
  store,
  form: formRef,
  update: insurancePolicyService.update,
  canUpdate: canEdit,
  label: (record) => record.policyNumber,
  saveErrorFallback: t('fleet.insurancePolicies.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value
    ? `${item.value.no} · ${item.value.policyNumber} · ${item.value.vehiclePlate}`
    : t('fleet.insurancePolicies.card')
)

const showTerminate = ref(false)
const terminatedOn = ref<string | null>(null)
const reason = ref('')
const terminating = ref(false)

function openTerminate() {
  terminatedOn.value = todayIso()
  reason.value = ''
  showTerminate.value = true
}

async function confirmTerminate() {
  const no = item.value?.no
  if (!no || !terminatedOn.value || !reason.value.trim()) return
  terminating.value = true
  saveError.value = null
  try {
    store.setCurrentItem(
      await insurancePolicyService.terminate(no, terminatedOn.value, reason.value)
    )
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    showTerminate.value = false
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.insurancePolicies.actionError'))
  } finally {
    terminating.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.insurancePolicies.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.insurancePolicies.saveSuccess')"
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
      <PolicyStatePill v-if="item" :state="item.state" />
    </template>
    <template v-if="canEdit && !isEditMode && !isFormDirty" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="openTerminate"
      >
        <FileX class="w-5 h-5 text-primary" /> {{ t('fleet.insurancePolicies.action.terminate') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <InsurancePolicyForm
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
    :open="showTerminate"
    :title="t('fleet.insurancePolicies.action.terminate')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!terminatedOn || !reason.trim()"
    :loading="terminating"
    destructive
    panel-class="max-w-md"
    @confirm="confirmTerminate"
    @cancel="showTerminate = false"
  >
    <div class="space-y-3">
      <p class="text-sm text-muted-foreground">{{ t('fleet.insurancePolicies.terminateHint') }}</p>
      <BaseFormField :label="t('fleet.insurancePolicies.form.terminatedOn')" required>
        <DateFormInput v-model="terminatedOn" />
      </BaseFormField>
      <BaseFormField :label="t('fleet.insurancePolicies.form.terminationReason')" required>
        <FormTextarea v-model="reason" :rows="3" :maxlength="300" />
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
