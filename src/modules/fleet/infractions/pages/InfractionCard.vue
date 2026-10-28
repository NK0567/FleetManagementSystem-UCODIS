<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FolderCheck, UserCheck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import InfractionForm from '../components/InfractionForm.vue'
import { triggersTraining, type InfractionOutcome } from '../domain/infraction'
import { infractionService } from '../services/infractionService'
import { useInfractionStore } from '../stores/infractionStore'

const props = defineProps<{
  infractionNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useInfractionStore()
const { canUpdate, canInsert } = usePermissions('INFRACTION')
const canEdit = computed(() => canUpdate.value && store.currentItem?.status !== 'closed')
const formRef = ref<InstanceType<typeof InfractionForm> | null>(null)

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
  no: () => props.infractionNo,
  store,
  form: formRef,
  update: infractionService.update,
  canUpdate: canEdit,
  label: (record) => record.no,
  saveErrorFallback: t('fleet.infractions.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value
    ? `${item.value.no} · ${item.value.infractionTypeName} · ${item.value.vehiclePlate}`
    : t('fleet.infractions.card')
)

const showActions = computed(
  () => canEdit.value && !!item.value && !isEditMode.value && !isFormDirty.value
)
const working = ref(false)

async function run(action: () => ReturnType<typeof infractionService.take>) {
  working.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.infractions.actionError'))
    return false
  } finally {
    working.value = false
  }
}

function take() {
  const no = item.value?.no
  if (no) void run(() => infractionService.take(no))
}

const showClose = ref(false)
const outcome = ref<InfractionOutcome | null>(null)
const comment = ref('')
const needsDriver = computed(
  () => !!outcome.value && triggersTraining(outcome.value) && !item.value?.driverNo
)

function openClose() {
  outcome.value = null
  comment.value = ''
  showClose.value = true
}

async function confirmClose() {
  const no = item.value?.no
  if (!no || !outcome.value || !comment.value.trim()) return
  const chosen = outcome.value
  if (await run(() => infractionService.close(no, chosen, comment.value))) showClose.value = false
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.infractions.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || working"
    :actions-disabled="isLoading || isSaving || working"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.infractions.saveSuccess')"
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
      <InfractionStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="showActions" #action-buttons>
      <button
        v-if="item?.status === 'new'"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="take"
      >
        <UserCheck class="w-5 h-5 text-primary" /> {{ t('fleet.infractions.action.take') }}
      </button>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="openClose"
      >
        <FolderCheck class="w-5 h-5 text-primary" /> {{ t('fleet.infractions.action.close') }}
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
          <InfractionForm
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
    :open="showClose"
    :title="t('fleet.infractions.action.close')"
    :confirm-label="t('fleet.infractions.action.close')"
    :confirm-disabled="!outcome || !comment.trim() || needsDriver"
    :loading="working"
    panel-class="max-w-md"
    @confirm="confirmClose"
    @cancel="showClose = false"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('fleet.infractions.form.outcome')" required>
        <OptionsSelect
          :model-value="outcome"
          options-key="infractionOutcome"
          @update:model-value="outcome = String($event) as InfractionOutcome"
        />
        <p v-if="outcome && triggersTraining(outcome)" class="text-xs text-muted-foreground mt-1">
          {{ t('fleet.infractions.trainingHint') }}
        </p>
        <p v-if="needsDriver" class="text-xs text-destructive mt-1">
          {{ t('fleet.infractions.driverRequired') }}
        </p>
      </BaseFormField>
      <BaseFormField :label="t('fleet.infractions.form.outcomeComment')" required>
        <FormTextarea v-model="comment" :rows="3" :maxlength="500" />
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
