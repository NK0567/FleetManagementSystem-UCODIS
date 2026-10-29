<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardCheck, Flag, MapPinCheck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { nowIsoDateTime } from '@/utils/date'
import { formatDateTime } from '@/utils/format'
import type { MobileInterventionAction } from '../api/mobileInterventionApi'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import MobileInterventionForm from '../components/MobileInterventionForm.vue'
import { mobileInterventionService } from '../services/mobileInterventionService'
import { useMobileInterventionStore } from '../stores/mobileInterventionStore'

const props = defineProps<{
  mobileInterventionNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useMobileInterventionStore()
const { canUpdate, canInsert } = usePermissions('MOBILEINTERVENTION')
const formRef = ref<InstanceType<typeof MobileInterventionForm> | null>(null)

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
  no: () => props.mobileInterventionNo,
  store,
  form: formRef,
  update: mobileInterventionService.update,
  canUpdate,
  label: (record) => record.vehiclePlate,
  saveErrorFallback: t('maintenance.mobileInterventions.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value
    ? `${item.value.no} · ${item.value.vehiclePlate}`
    : t('maintenance.mobileInterventions.card')
)

/** Same floor as the server for the observation of an unsolved mission. */
const MIN_TEXT = 10

const open = computed(() => !!item.value && !item.value.closedAt)
const acting = ref(false)
type Dialog = 'arrive' | 'checks' | 'close' | null
const dialog = ref<Dialog>(null)
const arrivedAt = ref('')
const checks = ref({
  checkCount: null as number | null,
  positiveCount: null as number | null,
  checkComment: ''
})
const closing = ref({ resolved: true, observation: '', openWorkOrder: true })

function openDialog(next: Exclude<Dialog, null>) {
  arrivedAt.value = nowIsoDateTime().slice(0, 16)
  checks.value = {
    checkCount: item.value?.checkCount ?? null,
    positiveCount: item.value?.positiveCount ?? null,
    checkComment: item.value?.checkComment ?? ''
  }
  closing.value = { resolved: true, observation: '', openWorkOrder: true }
  dialog.value = next
}

const confirmDisabled = computed(() => {
  if (dialog.value === 'arrive') return !arrivedAt.value
  if (dialog.value === 'checks') {
    const { checkCount, positiveCount } = checks.value
    return (
      checkCount === null || positiveCount === null || Number(positiveCount) > Number(checkCount)
    )
  }
  return !closing.value.resolved && closing.value.observation.trim().length < MIN_TEXT
})

async function act(action: MobileInterventionAction, body: Record<string, unknown>) {
  const no = item.value?.no
  if (!no) return
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await mobileInterventionService.act(no, action, body))
    dialog.value = null
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('maintenance.mobileInterventions.saveError'))
  } finally {
    acting.value = false
  }
}

function confirm() {
  if (dialog.value === 'arrive') return act('arrive', { arrivedAt: arrivedAt.value })
  if (dialog.value === 'checks') return act('checks', checks.value)
  return act('close', {
    resolved: closing.value.resolved,
    observation: closing.value.observation.trim(),
    openWorkOrder: !closing.value.resolved && closing.value.openWorkOrder
  })
}

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('maintenance.mobileInterventions.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('maintenance.mobileInterventions.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="false"
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
      <MobileInterventionStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="canUpdate && open && item" #action-buttons>
      <button
        v-if="!item.arrivedAt"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="openDialog('arrive')"
      >
        <MapPinCheck class="w-5 h-5 text-primary" />
        {{ t('maintenance.mobileInterventions.action.arrive') }}
      </button>
      <button
        v-if="item.isControl"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="openDialog('checks')"
      >
        <ClipboardCheck class="w-5 h-5 text-primary" />
        {{ t('maintenance.mobileInterventions.action.checks') }}
      </button>
      <button
        type="button"
        :class="buttonClass"
        :disabled="acting || !item.arrivedAt"
        @click="openDialog('close')"
      >
        <Flag class="w-5 h-5 text-primary" />
        {{ t('maintenance.mobileInterventions.action.close') }}
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
          <MobileInterventionForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
          <div v-if="item" class="px-4 sm:px-6 lg:px-8 pb-6">
            <FormSection
              :open="true"
              :title="t('maintenance.mobileInterventions.section.progress')"
            >
              <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm xl:col-span-2">
                <dt class="text-muted-foreground">
                  {{ t('maintenance.mobileInterventions.form.crewNos') }}
                </dt>
                <dd>{{ item.crewNames }}</dd>
                <dt class="text-muted-foreground">
                  {{ t('maintenance.mobileInterventions.progress.arrivedAt') }}
                </dt>
                <dd>
                  {{ item.arrivedAt ? formatDateTime(item.arrivedAt) : '-' }}
                  <span v-if="item.delayMin !== null" class="text-muted-foreground">
                    ·
                    {{
                      t('maintenance.mobileInterventions.progress.delay', { min: item.delayMin })
                    }}
                  </span>
                </dd>
                <template v-if="item.isControl">
                  <dt class="text-muted-foreground">
                    {{ t('maintenance.mobileInterventions.progress.checks') }}
                  </dt>
                  <dd>
                    {{
                      item.checkCount === null
                        ? '-'
                        : t('maintenance.mobileInterventions.progress.checkCounts', {
                            checks: item.checkCount,
                            positives: item.positiveCount ?? 0
                          })
                    }}
                    <span v-if="item.checkComment" class="block text-muted-foreground">{{
                      item.checkComment
                    }}</span>
                  </dd>
                </template>
                <dt class="text-muted-foreground">
                  {{ t('maintenance.mobileInterventions.progress.closedAt') }}
                </dt>
                <dd>
                  {{ item.closedAt ? `${formatDateTime(item.closedAt)} · ${item.closedBy}` : '-' }}
                </dd>
                <template v-if="item.observation">
                  <dt class="text-muted-foreground">
                    {{ t('maintenance.mobileInterventions.form.observation') }}
                  </dt>
                  <dd class="whitespace-pre-line">{{ item.observation }}</dd>
                </template>
                <template v-if="item.workOrderNo">
                  <dt class="text-muted-foreground">
                    {{ t('maintenance.mobileInterventions.col.workOrderNo') }}
                  </dt>
                  <dd>
                    <RouterLink
                      :to="{
                        path: '/maintenance/work-orders',
                        query: { no: item.workOrderNo, cardMode: 'view' }
                      }"
                      class="text-primary hover:underline"
                    >
                      {{ item.workOrderNo }}
                    </RouterLink>
                  </dd>
                </template>
              </dl>
            </FormSection>
          </div>
        </div>
      </div>
    </template>
  </CardModalShell>

  <ConfirmDialog
    :open="dialog !== null"
    :title="dialog ? t(`maintenance.mobileInterventions.action.${dialog}`) : ''"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="confirmDisabled"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="dialog = null"
  >
    <div class="space-y-3">
      <BaseFormField
        v-if="dialog === 'arrive'"
        :label="t('maintenance.mobileInterventions.progress.arrivedAt')"
        required
      >
        <FormInput v-model="arrivedAt" type="datetime-local" />
      </BaseFormField>
      <template v-else-if="dialog === 'checks'">
        <BaseFormField :label="t('maintenance.mobileInterventions.form.checkCount')" required>
          <FormInput v-model="checks.checkCount" type="number" :min="0" :step="1" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.mobileInterventions.form.positiveCount')" required>
          <FormInput v-model="checks.positiveCount" type="number" :min="0" :step="1" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.mobileInterventions.form.checkComment')">
          <FormTextarea v-model="checks.checkComment" :rows="2" :maxlength="300" />
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'close'">
        <BaseFormField :label="t('maintenance.mobileInterventions.form.resolved')">
          <ToggleSwitch v-model="closing.resolved" />
        </BaseFormField>
        <BaseFormField
          :label="t('maintenance.mobileInterventions.form.observation')"
          :required="!closing.resolved"
        >
          <FormTextarea v-model="closing.observation" :rows="3" :maxlength="500" />
        </BaseFormField>
        <label v-if="!closing.resolved" class="flex items-center gap-2 text-sm">
          <input v-model="closing.openWorkOrder" type="checkbox" />
          {{ t('maintenance.mobileInterventions.form.openWorkOrder') }}
        </label>
      </template>
    </div>
  </ConfirmDialog>
</template>
