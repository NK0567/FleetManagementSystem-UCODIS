<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Scale } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import StockItemForm from '../components/StockItemForm.vue'
import { stockItemService } from '../services/stockItemService'
import { useStockItemStore } from '../stores/stockItemStore'

const props = defineProps<{
  stockItemNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useStockItemStore()
const { canUpdate, canInsert, canExecute } = usePermissions('STOCKITEM')
const formRef = ref<InstanceType<typeof StockItemForm> | null>(null)

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
  no: () => props.stockItemNo,
  store,
  form: formRef,
  update: stockItemService.update,
  canUpdate,
  label: (record) => record.name,
  saveErrorFallback: t('maintenance.stockItems.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.name}` : t('maintenance.stockItems.card')
)

/** Same floor as the server for the reason of an adjustment. */
const MIN_REASON = 10

const ledgerVersion = ref(0)
const adjusting = ref(false)
const acting = ref(false)
const adjustment = ref({ delta: null as number | null, reason: '' })

function openAdjust() {
  adjustment.value = { delta: null, reason: '' }
  adjusting.value = true
}

const adjustDisabled = computed(
  () =>
    !adjustment.value.delta ||
    !Number.isInteger(Number(adjustment.value.delta)) ||
    adjustment.value.reason.trim().length < MIN_REASON
)

async function adjust() {
  const no = item.value?.no
  if (!no || adjustDisabled.value) return
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(
      await stockItemService.adjust(
        no,
        Number(adjustment.value.delta),
        adjustment.value.reason.trim()
      )
    )
    adjusting.value = false
    ledgerVersion.value++
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('maintenance.stockItems.saveError'))
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('maintenance.stockItems.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('maintenance.stockItems.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canUpdate"
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
      <StockStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="canExecute && item && !isEditMode && !isFormDirty" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="openAdjust"
      >
        <Scale class="w-5 h-5 text-primary" /> {{ t('maintenance.stockItems.action.adjust') }}
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
          <StockItemForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
          <StockMovementsSection v-if="item" :item-no="item.no" :version="ledgerVersion" />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ConfirmDialog
    :open="adjusting"
    :title="t('maintenance.stockItems.action.adjust')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="adjustDisabled"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="adjust"
    @cancel="adjusting = false"
  >
    <div class="space-y-3">
      <p class="text-sm text-muted-foreground">
        {{ t('maintenance.stockItems.adjustHint', { quantity: item?.stockQuantity ?? 0 }) }}
      </p>
      <BaseFormField :label="t('maintenance.stockItems.form.delta')" required>
        <FormInput v-model="adjustment.delta" type="number" :step="1" />
      </BaseFormField>
      <BaseFormField :label="t('maintenance.stockItems.form.reason')" required>
        <FormTextarea v-model="adjustment.reason" :rows="3" :maxlength="300" />
        <p class="text-xs mt-1 text-muted-foreground">
          {{ t('common.minLength', { count: adjustment.reason.trim().length, min: MIN_REASON }) }}
        </p>
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
