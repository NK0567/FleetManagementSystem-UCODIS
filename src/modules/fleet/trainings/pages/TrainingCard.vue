<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, CircleX } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { todayIso } from '@/utils/date'
import TrainingForm from '../components/TrainingForm.vue'
import { isPending } from '../domain/training'
import { trainingService } from '../services/trainingService'
import { useTrainingStore } from '../stores/trainingStore'

const props = defineProps<{
  trainingNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useTrainingStore()
const { canUpdate, canInsert } = usePermissions('TRAINING')
const canEdit = computed(
  () => canUpdate.value && !!store.currentItem && isPending(store.currentItem.status)
)
const formRef = ref<InstanceType<typeof TrainingForm> | null>(null)

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
  no: () => props.trainingNo,
  store,
  form: formRef,
  update: trainingService.update,
  canUpdate: canEdit,
  label: (record) => record.topic,
  saveErrorFallback: t('fleet.trainings.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.employeeName}` : t('fleet.trainings.card')
)

const showActions = computed(
  () => canEdit.value && !!item.value && !isEditMode.value && !isFormDirty.value
)
const working = ref(false)

async function run(action: () => ReturnType<typeof trainingService.cancel>) {
  working.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.trainings.actionError'))
    return false
  } finally {
    working.value = false
  }
}

const showAttend = ref(false)
const attendedOn = ref<string | null>(null)
const result = ref('')

function openAttend() {
  const planned = item.value?.plannedOn ?? null
  attendedOn.value = planned && planned <= todayIso() ? planned : todayIso()
  result.value = ''
  showAttend.value = true
}

async function confirmAttend() {
  const no = item.value?.no
  const day = attendedOn.value
  if (!no || !day) return
  if (await run(() => trainingService.attend(no, day, result.value))) showAttend.value = false
}

const cancelling = ref(false)

async function cancelTraining(reason: string) {
  const no = item.value?.no
  if (no && (await run(() => trainingService.cancel(no, reason)))) cancelling.value = false
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.trainings.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || working"
    :actions-disabled="isLoading || isSaving || working"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.trainings.saveSuccess')"
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
      <TrainingStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="showActions" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="item?.status !== 'planned'"
        :title="item?.status !== 'planned' ? t('fleet.trainings.planFirst') : undefined"
        @click="openAttend"
      >
        <CircleCheck class="w-5 h-5 text-primary" /> {{ t('fleet.trainings.action.attend') }}
      </button>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="cancelling = true"
      >
        <CircleX class="w-5 h-5 text-primary" /> {{ t('fleet.trainings.action.cancel') }}
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
          <TrainingForm
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
    :open="showAttend"
    :title="t('fleet.trainings.action.attend')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!attendedOn"
    :loading="working"
    panel-class="max-w-md"
    @confirm="confirmAttend"
    @cancel="showAttend = false"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('fleet.trainings.form.attendedOn')" required>
        <DateFormInput v-model="attendedOn" />
      </BaseFormField>
      <BaseFormField :label="t('fleet.trainings.form.result')">
        <FormTextarea v-model="result" :rows="3" :maxlength="300" />
      </BaseFormField>
    </div>
  </ConfirmDialog>

  <ReasonDialog
    :open="cancelling"
    :title="t('fleet.trainings.action.cancel')"
    :label="t('fleet.trainings.form.cancelReason')"
    :confirm-label="t('fleet.trainings.action.cancel')"
    destructive
    :loading="working"
    @confirm="cancelTraining"
    @cancel="cancelling = false"
  />
</template>
