<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, CircleX, Combine, Split, Star } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { MoreAction } from '@/components/shared/MoreActionsMenu.vue'
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

/* The orderer's survey, once the transport order is completed (TRS04-US07). */
const surveying = ref(false)
const survey = ref({ orderScore: 0, delayScore: 0, qualityScore: 0, comment: '' })
const SURVEY_FIELDS = ['orderScore', 'delayScore', 'qualityScore'] as const
async function sendSurvey() {
  if (await run('satisfaction', { ...survey.value })) surveying.value = false
}

async function act(choice: { reasonNo: string; comment: string }) {
  if (dialog.value && (await run(dialog.value, choice))) dialog.value = null
}

/* The orderer's survey is the one gesture put forward; the planner's corrections of a waiting
 * order (reject, split, merge, cancel) wait in « Plus d'actions ». */
const canSurvey = computed(
  () => !!item.value && canUpdate.value && item.value.orderCompleted && !item.value.ordererSurvey
)
const moreActions = computed<MoreAction[]>(() => {
  const order = item.value
  if (!order) return []
  return [
    {
      key: 'reject',
      label: t('planning.deliveryRequests.action.reject'),
      icon: CircleX,
      hidden: !canExecute.value || !canReject(order.status),
      disabled: acting.value,
      onSelect: () => (dialog.value = 'reject')
    },
    {
      key: 'split',
      label: t('planning.deliveryRequests.action.split'),
      icon: Split,
      hidden: !canExecute.value || order.status !== 'pending' || order.lineCount > 1,
      disabled: acting.value,
      onSelect: () => ((splitQuantity.value = null), (splitting.value = true))
    },
    {
      key: 'merge',
      label: t('planning.deliveryRequests.action.merge'),
      icon: Combine,
      hidden: !canExecute.value || order.status !== 'pending' || !!order.parentNo,
      disabled: acting.value,
      onSelect: () => void run('merge')
    },
    {
      key: 'cancel',
      label: t('planning.deliveryRequests.action.cancel'),
      icon: Ban,
      danger: true,
      hidden: !canUpdate.value || !canCancel(order.status),
      disabled: acting.value,
      onSelect: () => (dialog.value = 'cancel')
    }
  ]
})
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
    :more-actions="item && !isEditMode && !isFormDirty ? moreActions : []"
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
    <template v-if="item && !isEditMode && !isFormDirty && canSurvey" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded hover:opacity-90 transition disabled:opacity-50"
        :disabled="acting"
        @click="surveying = true"
      >
        <Star class="w-4 h-4" /> {{ t('planning.deliveryRequests.survey.open') }}
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
          <div
            v-if="item?.ordererSurvey"
            class="mx-6 mt-4 rounded border border-border px-4 py-3 text-sm space-y-1"
          >
            <p class="font-medium text-card-foreground">
              {{ t('planning.deliveryRequests.survey.answered') }}
            </p>
            <p v-for="field in SURVEY_FIELDS" :key="field" class="text-muted-foreground">
              {{ t(`planning.deliveryRequests.survey.${field}`) }} :
              <span class="text-warning">{{ '★'.repeat(item.ordererSurvey[field]) }}</span>
            </p>
            <p v-if="item.ordererSurvey.comment">{{ item.ordererSurvey.comment }}</p>
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

  <ConfirmDialog
    :open="surveying"
    :title="t('planning.deliveryRequests.survey.open')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="SURVEY_FIELDS.some((field) => !survey[field])"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="sendSurvey"
    @cancel="surveying = false"
  >
    <div class="space-y-3">
      <p class="text-sm text-muted-foreground">{{ t('planning.deliveryRequests.survey.hint') }}</p>
      <div v-for="field in SURVEY_FIELDS" :key="field">
        <p class="text-sm text-card-foreground">
          {{ t(`planning.deliveryRequests.survey.${field}`) }}
        </p>
        <div class="flex gap-1">
          <button
            v-for="value in 5"
            :key="value"
            type="button"
            class="cursor-pointer text-2xl leading-none"
            :class="value <= survey[field] ? 'text-warning' : 'text-muted-foreground'"
            :aria-label="`${t(`planning.deliveryRequests.survey.${field}`)} ${value}`"
            @click="survey[field] = value"
          >
            ★
          </button>
        </div>
      </div>
      <BaseFormField :label="t('planning.deliveryRequests.survey.comment')">
        <FormTextarea v-model="survey.comment" :rows="2" :maxlength="300" />
      </BaseFormField>
    </div>
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
