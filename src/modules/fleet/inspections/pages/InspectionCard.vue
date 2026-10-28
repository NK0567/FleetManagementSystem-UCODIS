<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardCheck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { todayIso } from '@/utils/date'
import InspectionForm from '../components/InspectionForm.vue'
import { awaitsRecheck } from '../domain/inspection'
import { inspectionService } from '../services/inspectionService'
import { useInspectionStore } from '../stores/inspectionStore'

const props = defineProps<{
  inspectionNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useInspectionStore()
const { canUpdate, canInsert } = usePermissions('INSPECTION')
const formRef = ref<InstanceType<typeof InspectionForm> | null>(null)

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
  no: () => props.inspectionNo,
  store,
  form: formRef,
  update: inspectionService.update,
  canUpdate,
  label: (record) => record.vehiclePlate,
  saveErrorFallback: t('fleet.inspections.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.vehiclePlate}` : t('fleet.inspections.card')
)

const canRecheck = computed(
  () => canUpdate.value && !!item.value && !isEditMode.value && awaitsRecheck(item.value)
)
const showRecheck = ref(false)
const recheckDoneOn = ref<string | null>(null)
const rechecking = ref(false)

function openRecheck() {
  recheckDoneOn.value = todayIso()
  showRecheck.value = true
}

async function confirmRecheck() {
  const no = item.value?.no
  const day = recheckDoneOn.value
  if (!no || !day) return
  rechecking.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await inspectionService.recheck(no, day))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    showRecheck.value = false
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.inspections.actionError'))
  } finally {
    rechecking.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.inspections.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.inspections.saveSuccess')"
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
      <InspectionStatePill v-if="item" :state="item.state" />
    </template>
    <template v-if="item && !isFormDirty" #action-buttons>
      <SourceWorkOrder
        origin="inspection"
        :origin-no="item.no"
        :work-order-no="item.workOrderNo"
        :eligible="item.result === 'non_conforming' && !item.recheckDoneOn"
      />
      <button
        v-if="canRecheck"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="openRecheck"
      >
        <ClipboardCheck class="w-5 h-5 text-primary" /> {{ t('fleet.inspections.action.recheck') }}
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
          <InspectionForm
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
    :open="showRecheck"
    :title="t('fleet.inspections.action.recheck')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!recheckDoneOn"
    :loading="rechecking"
    panel-class="max-w-md"
    @confirm="confirmRecheck"
    @cancel="showRecheck = false"
  >
    <BaseFormField :label="t('fleet.inspections.form.recheckDoneOn')" required>
      <DateFormInput v-model="recheckDoneOn" />
    </BaseFormField>
  </ConfirmDialog>
</template>
