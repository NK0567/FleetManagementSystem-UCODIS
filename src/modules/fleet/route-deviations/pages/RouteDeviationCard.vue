<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageSquareText, Scale } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { nowIsoDateTime } from '@/utils/date'
import {
  allowedDecisions,
  DEVIATION_DECISIONS,
  type DeviationDecision,
  type QualifiedNature
} from '../domain/routeDeviation'
import RouteDeviationForm from '../components/RouteDeviationForm.vue'
import { routeDeviationService } from '../services/routeDeviationService'
import { useRouteDeviationStore } from '../stores/routeDeviationStore'

const props = defineProps<{
  routeDeviationNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useRouteDeviationStore()
const { canUpdate, canInsert, canExecute } = usePermissions('ROUTEDEVIATION')
/** A qualified deviation is settled: it no longer changes. */
const canEdit = computed(() => canUpdate.value && store.currentItem?.nature === 'to_qualify')
const formRef = ref<InstanceType<typeof RouteDeviationForm> | null>(null)

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
  no: () => props.routeDeviationNo,
  store,
  form: formRef,
  update: routeDeviationService.update,
  canUpdate: canEdit,
  label: (record) => record.deviationTypeName,
  saveErrorFallback: t('fleet.routeDeviations.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value
    ? `${item.value.no} · ${item.value.deviationTypeName}`
    : t('fleet.routeDeviations.card')
)

const showActions = computed(
  () => canEdit.value && !!item.value && !isEditMode.value && !isFormDirty.value
)
const canJustify = computed(
  () =>
    !!item.value &&
    !item.value.justification &&
    nowIsoDateTime() <= item.value.justificationDeadline
)
const working = ref(false)

async function run(action: () => ReturnType<typeof routeDeviationService.justify>) {
  working.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.routeDeviations.actionError'))
    return false
  } finally {
    working.value = false
  }
}

const justifying = ref(false)

async function justify(text: string) {
  justifying.value = false
  const no = item.value?.no
  if (no) await run(() => routeDeviationService.justify(no, text))
}

const showQualify = ref(false)
const nature = ref<QualifiedNature>('endured')
const decision = ref<DeviationDecision>('dismissed')
const reason = ref('')
const hiddenDecisions = computed(() =>
  DEVIATION_DECISIONS.filter((value) => !allowedDecisions(nature.value).includes(value))
)

function openQualify() {
  nature.value = 'endured'
  decision.value = 'dismissed'
  reason.value = ''
  showQualify.value = true
}

function setNature(value: QualifiedNature) {
  nature.value = value
  if (!allowedDecisions(value).includes(decision.value)) decision.value = 'dismissed'
}

async function confirmQualify() {
  const no = item.value?.no
  if (!no || !reason.value.trim()) return
  const done = await run(() =>
    routeDeviationService.qualify(no, {
      nature: nature.value,
      decision: decision.value,
      reason: reason.value
    })
  )
  if (done) showQualify.value = false
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.routeDeviations.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.routeDeviations.saveSuccess')"
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
      <DeviationNaturePill v-if="item" :nature="item.nature" />
    </template>
    <template v-if="showActions" #action-buttons>
      <button
        v-if="canExecute"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        @click="openQualify"
      >
        <Scale class="w-4 h-4" /> {{ t('fleet.routeDeviations.action.qualify') }}
      </button>
      <button
        v-if="canJustify"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="justifying = true"
      >
        <MessageSquareText class="w-5 h-5 text-primary" />
        {{ t('fleet.routeDeviations.action.justify') }}
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
          <RouteDeviationForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ReasonDialog
    :open="justifying"
    :title="t('fleet.routeDeviations.action.justify')"
    :label="t('fleet.routeDeviations.form.justification')"
    :confirm-label="t('common.confirm')"
    :loading="working"
    @confirm="justify"
    @cancel="justifying = false"
  />

  <ConfirmDialog
    :open="showQualify"
    :title="t('fleet.routeDeviations.action.qualify')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!reason.trim()"
    :loading="working"
    panel-class="max-w-md"
    @confirm="confirmQualify"
    @cancel="showQualify = false"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('fleet.routeDeviations.form.nature')" required>
        <OptionsSelect
          :model-value="nature"
          options-key="deviationNature"
          :hidden-values="['to_qualify']"
          @update:model-value="setNature(String($event) as QualifiedNature)"
        />
      </BaseFormField>
      <BaseFormField :label="t('fleet.routeDeviations.form.decision')" required>
        <OptionsSelect
          :model-value="decision"
          options-key="deviationDecision"
          :hidden-values="hiddenDecisions"
          @update:model-value="decision = String($event) as DeviationDecision"
        />
      </BaseFormField>
      <BaseFormField :label="t('fleet.routeDeviations.form.reason')" required>
        <FormTextarea v-model="reason" :rows="3" :maxlength="500" />
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
