<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FolderCheck, ShieldCheck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import ClaimForm from '../components/ClaimForm.vue'
import {
  closureBlocks,
  INSURANCE_STATUSES,
  needsIndemnity,
  nextInsuranceStatuses,
  type InsuranceStatus
} from '../domain/claim'
import { claimService } from '../services/claimService'
import { useClaimStore } from '../stores/claimStore'

const props = defineProps<{
  claimNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useClaimStore()
const { canUpdate, canInsert, canExecute } = usePermissions('CLAIM')
const canEdit = computed(() => canUpdate.value && store.currentItem?.status === 'open')
const formRef = ref<InstanceType<typeof ClaimForm> | null>(null)

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
  no: () => props.claimNo,
  store,
  form: formRef,
  update: claimService.update,
  canUpdate: canEdit,
  label: (record) => record.no,
  saveErrorFallback: t('fleet.claims.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.vehiclePlate}` : t('fleet.claims.card')
)

const showActions = computed(() => !!item.value && !isEditMode.value && !isFormDirty.value)
const nextSteps = computed(() =>
  item.value ? nextInsuranceStatuses(item.value.insuranceStatus) : []
)
const hiddenSteps = computed(() =>
  INSURANCE_STATUSES.filter((status) => !nextSteps.value.includes(status))
)
const blocks = computed(() => (item.value ? closureBlocks(item.value) : []))
const blockText = computed(() =>
  blocks.value.map((block) => t(`fleet.claims.closureBlock.${block}`)).join(' · ')
)

const working = ref(false)

async function run(action: () => ReturnType<typeof claimService.close>) {
  working.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.claims.actionError'))
    return false
  } finally {
    working.value = false
  }
}

const showInsurance = ref(false)
const step = ref<InsuranceStatus>('declared')
const indemnity = ref<number | null>(null)
const comment = ref('')

function openInsurance() {
  step.value = nextSteps.value[0] ?? 'declared'
  indemnity.value = item.value?.indemnityAmount ?? null
  comment.value = ''
  showInsurance.value = true
}

async function confirmInsurance() {
  const no = item.value?.no
  if (!no) return
  const done = await run(() =>
    claimService.insurance(no, {
      status: step.value,
      indemnityAmount: needsIndemnity(step.value) ? indemnity.value : null,
      comment: comment.value
    })
  )
  if (done) showInsurance.value = false
}

const showClose = ref(false)

async function confirmClose() {
  const no = item.value?.no
  if (no && (await run(() => claimService.close(no)))) showClose.value = false
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.claims.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || working"
    :actions-disabled="isLoading || isSaving || working"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.claims.saveSuccess')"
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
      <template v-if="item">
        <ClaimStatusPill :status="item.status" />
        <ClaimInsurancePill :status="item.insuranceStatus" />
      </template>
    </template>
    <template v-if="showActions && item?.status === 'open'" #action-buttons>
      <button
        v-if="canEdit && nextSteps.length"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="openInsurance"
      >
        <ShieldCheck class="w-5 h-5 text-primary" /> {{ t('fleet.claims.action.insurance') }}
      </button>
      <button
        v-if="canExecute"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="blocks.length > 0"
        :title="blockText || undefined"
        @click="showClose = true"
      >
        <FolderCheck class="w-5 h-5 text-primary" /> {{ t('fleet.claims.action.close') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving || working"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <ClaimForm
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
    :open="showInsurance"
    :title="t('fleet.claims.action.insurance')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="needsIndemnity(step) && indemnity == null"
    :loading="working"
    panel-class="max-w-md"
    @confirm="confirmInsurance"
    @cancel="showInsurance = false"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('fleet.claims.form.insuranceStep')" required>
        <OptionsSelect
          :model-value="step"
          options-key="claimInsuranceStatus"
          :hidden-values="hiddenSteps"
          @update:model-value="step = String($event) as InsuranceStatus"
        />
      </BaseFormField>
      <BaseFormField
        v-if="needsIndemnity(step)"
        :label="t('fleet.claims.form.indemnityAmount')"
        required
      >
        <FormInput v-model="indemnity" type="number" :min="0" />
      </BaseFormField>
      <BaseFormField :label="t('fleet.claims.form.comment')">
        <FormTextarea v-model="comment" :rows="2" :maxlength="300" />
      </BaseFormField>
    </div>
  </ConfirmDialog>

  <ConfirmDialog
    :open="showClose"
    :title="t('fleet.claims.action.close')"
    :message="t('fleet.claims.closeHint')"
    :confirm-label="t('fleet.claims.action.close')"
    :loading="working"
    @confirm="confirmClose"
    @cancel="showClose = false"
  />
</template>
