<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, CircleX, Combine, Split } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import type { DeliveryRequestAction } from '../api/deliveryRequestApi'
import DeliveryRequestForm from '../components/DeliveryRequestForm.vue'
import { canCancel, canReject, isEditable } from '../domain/deliveryRequest'
import { deliveryRequestService } from '../services/deliveryRequestService'
import { useDeliveryRequestStore } from '../stores/deliveryRequestStore'

const props = defineProps<{
  deliveryRequestNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useDeliveryRequestStore()
const { canUpdate, canInsert, canExecute } = usePermissions('DELIVERYREQUEST')
const formRef = ref<InstanceType<typeof DeliveryRequestForm> | null>(null)

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
  no: () => props.deliveryRequestNo,
  store,
  form: formRef,
  update: deliveryRequestService.update,
  canUpdate,
  label: (record) => record.deliveryPointName,
  saveErrorFallback: t('planning.deliveryRequests.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value
    ? `${item.value.no} · ${item.value.deliveryPointName}`
    : t('planning.deliveryRequests.card')
)

const acting = ref(false)
const dialog = ref<'reject' | 'cancel' | null>(null)
const splitting = ref(false)
const splitQuantity = ref<number | null>(null)

async function run(action: DeliveryRequestAction, body: Record<string, unknown> = {}) {
  const no = item.value?.no
  if (!no) return false
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await deliveryRequestService.act(no, action, body))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.deliveryRequests.saveError'))
    return false
  } finally {
    acting.value = false
  }
}

async function split() {
  if (await run('split', { quantity: splitQuantity.value })) splitting.value = false
}

async function act(choice: { reasonNo: string; comment: string }) {
  if (dialog.value && (await run(dialog.value, choice))) dialog.value = null
}

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('planning.deliveryRequests.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('planning.deliveryRequests.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canUpdate && !!item && isEditable(item.status)"
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
      <DeliveryRequestStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="item && !isEditMode && !isFormDirty" #action-buttons>
      <button
        v-if="canExecute && canReject(item.status)"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="dialog = 'reject'"
      >
        <CircleX class="w-5 h-5 text-primary" /> {{ t('planning.deliveryRequests.action.reject') }}
      </button>
      <button
        v-if="canExecute && item.status === 'pending'"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="((splitQuantity = null), (splitting = true))"
      >
        <Split class="w-5 h-5 text-primary" /> {{ t('planning.deliveryRequests.action.split') }}
      </button>
      <button
        v-if="canExecute && item.status === 'pending' && !item.parentNo"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="run('merge')"
      >
        <Combine class="w-5 h-5 text-primary" /> {{ t('planning.deliveryRequests.action.merge') }}
      </button>
      <button
        v-if="canUpdate && canCancel(item.status)"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="dialog = 'cancel'"
      >
        <Ban class="w-5 h-5 text-primary" /> {{ t('planning.deliveryRequests.action.cancel') }}
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
          <div
            v-if="item?.rejectedAt || item?.cancelledAt"
            class="mx-6 mt-4 rounded border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            <p class="font-medium text-card-foreground">
              {{
                item.cancelledAt
                  ? t('planning.deliveryRequests.cancelledBecause', {
                      reason: item.cancellationReasonName
                    })
                  : t('planning.deliveryRequests.rejectedBecause', {
                      reason: item.rejectionReasonName
                    })
              }}
            </p>
            <p
              v-if="item.cancelledAt ? item.cancellationComment : item.rejectionComment"
              class="text-muted-foreground mt-1"
            >
              {{ item.cancelledAt ? item.cancellationComment : item.rejectionComment }}
            </p>
            <p v-if="!item.cancelledAt && canUpdate" class="text-muted-foreground mt-1">
              {{ t('planning.deliveryRequests.resubmitHint') }}
            </p>
          </div>
          <DeliveryRequestForm
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
    :open="splitting"
    :title="t('planning.deliveryRequests.action.split')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="
      !splitQuantity || splitQuantity <= 0 || splitQuantity >= (item?.quantity ?? 0)
    "
    :loading="acting"
    panel-class="max-w-md"
    @confirm="split"
    @cancel="splitting = false"
  >
    <BaseFormField
      :label="t('planning.deliveryRequests.splitQuantity', { unit: item?.unit ?? '' })"
      required
    >
      <FormInput v-model="splitQuantity" type="number" :min="0" />
      <p class="text-xs text-muted-foreground mt-1">
        {{ t('planning.deliveryRequests.splitHint', { quantity: item?.quantity ?? 0 }) }}
      </p>
    </BaseFormField>
  </ConfirmDialog>

  <PlanningReasonDialog
    :open="dialog !== null"
    :title="dialog ? t(`planning.deliveryRequests.action.${dialog}`) : ''"
    :kind="dialog === 'reject' ? 'request_rejection' : 'cancellation'"
    :loading="acting"
    destructive
    @confirm="act"
    @cancel="dialog = null"
  />
</template>
