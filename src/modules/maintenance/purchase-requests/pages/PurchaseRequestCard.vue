<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, PackageCheck, ShoppingCart } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { PurchaseRequestAction } from '../api/purchaseRequestApi'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import PurchaseRequestForm from '../components/PurchaseRequestForm.vue'
import { purchaseRequestService } from '../services/purchaseRequestService'
import { usePurchaseRequestStore } from '../stores/purchaseRequestStore'

const props = defineProps<{
  purchaseRequestNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = usePurchaseRequestStore()
const { canUpdate, canInsert, canExecute } = usePermissions('PURCHASEREQUEST')
const formRef = ref<InstanceType<typeof PurchaseRequestForm> | null>(null)

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
  no: () => props.purchaseRequestNo,
  store,
  form: formRef,
  update: purchaseRequestService.update,
  canUpdate,
  label: (record) => record.label,
  saveErrorFallback: t('maintenance.purchaseRequests.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.label}` : t('maintenance.purchaseRequests.card')
)

/** Same floor as the server for the reason of a cancellation. */
const MIN_REASON = 10

const acting = ref(false)
const dialog = ref<'order' | 'receive' | null>(null)
const cancelling = ref(false)
const ordering = ref({ orderNumber: '', supplierNo: '' })
const finalAmount = ref<number | null>(null)

function open(next: 'order' | 'receive') {
  ordering.value = { orderNumber: '', supplierNo: item.value?.supplierNo ?? '' }
  finalAmount.value = item.value?.estimatedAmount ?? null
  dialog.value = next
}

async function act(action: PurchaseRequestAction, body: Record<string, unknown> = {}) {
  const no = item.value?.no
  if (!no) return false
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await purchaseRequestService.act(no, action, body))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('maintenance.purchaseRequests.saveError'))
    return false
  } finally {
    acting.value = false
  }
}

async function confirm() {
  const done =
    dialog.value === 'order'
      ? await act('order', ordering.value)
      : await act('receive', { finalAmount: finalAmount.value })
  if (done) dialog.value = null
}

async function cancel(reason: string) {
  if (await act('cancel', { reason })) cancelling.value = false
}

const primaryClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed'
const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('maintenance.purchaseRequests.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('maintenance.purchaseRequests.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canUpdate && item?.status === 'requested'"
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
      <PurchaseRequestStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="item && !isEditMode && !isFormDirty" #action-buttons>
      <button
        v-if="canUpdate && item.status === 'requested'"
        type="button"
        :class="primaryClass"
        :disabled="acting"
        @click="open('order')"
      >
        <ShoppingCart class="w-5 h-5" />
        {{ t('maintenance.purchaseRequests.action.order') }}
      </button>
      <button
        v-if="canUpdate && item.status === 'ordered'"
        type="button"
        :class="primaryClass"
        :disabled="acting"
        @click="open('receive')"
      >
        <PackageCheck class="w-5 h-5" />
        {{ t('maintenance.purchaseRequests.action.receive') }}
      </button>
      <button
        v-if="canExecute && (item.status === 'requested' || item.status === 'ordered')"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="cancelling = true"
      >
        <Ban class="w-5 h-5 text-primary" /> {{ t('maintenance.purchaseRequests.action.cancel') }}
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
          <PurchaseRequestForm
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
    :open="dialog !== null"
    :title="dialog ? t(`maintenance.purchaseRequests.action.${dialog}`) : ''"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="dialog === 'order' && (!ordering.orderNumber.trim() || !ordering.supplierNo)"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="dialog = null"
  >
    <div class="space-y-3">
      <template v-if="dialog === 'order'">
        <BaseFormField :label="t('maintenance.purchaseRequests.form.supplierNo')" required>
          <ReferenceLookup
            v-model="ordering.supplierNo"
            reference-key="partsSuppliers"
            :modal-title="t('maintenance.purchaseRequests.form.supplierNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.purchaseRequests.form.orderNumber')" required>
          <FormInput v-model="ordering.orderNumber" :maxlength="40" />
        </BaseFormField>
      </template>
      <template v-else>
        <p class="text-sm text-muted-foreground">
          {{
            item?.workOrderNo
              ? t('maintenance.purchaseRequests.receiveForOrder', { no: item.workOrderNo })
              : t('maintenance.purchaseRequests.receiveToStock')
          }}
        </p>
        <BaseFormField :label="t('maintenance.purchaseRequests.form.finalAmount')">
          <FormInput v-model="finalAmount" type="number" :min="0" />
        </BaseFormField>
      </template>
    </div>
  </ConfirmDialog>

  <ReasonDialog
    :open="cancelling"
    :title="t('maintenance.purchaseRequests.action.cancel')"
    :label="t('maintenance.purchaseRequests.form.reason')"
    :confirm-label="t('common.confirm')"
    :min-length="MIN_REASON"
    :loading="acting"
    destructive
    @confirm="cancel"
    @cancel="cancelling = false"
  />
</template>
