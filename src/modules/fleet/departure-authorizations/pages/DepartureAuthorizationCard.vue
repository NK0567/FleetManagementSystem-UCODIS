<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, CircleX } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import DepartureAuthorizationForm from '../components/DepartureAuthorizationForm.vue'
import { departureAuthorizationService } from '../services/departureAuthorizationService'
import { useDepartureAuthorizationStore } from '../stores/departureAuthorizationStore'

const props = defineProps<{
  departureAuthorizationNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useDepartureAuthorizationStore()
const { canUpdate, canInsert, canExecute } = usePermissions('DEPARTUREAUTHORIZATION')
/** Driver checks can be redone while the request awaits its decision. */
const canEdit = computed(() => canUpdate.value && store.currentItem?.decision === 'pending')
const formRef = ref<InstanceType<typeof DepartureAuthorizationForm> | null>(null)

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
  no: () => props.departureAuthorizationNo,
  store,
  form: formRef,
  update: departureAuthorizationService.update,
  canUpdate: canEdit,
  label: (record) => record.tripNo,
  saveErrorFallback: t('fleet.departureAuthorizations.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.tripNo}` : t('fleet.departureAuthorizations.card')
)

const showDecision = computed(
  () =>
    canExecute.value &&
    item.value?.decision === 'pending' &&
    !isEditMode.value &&
    !isFormDirty.value
)
const failedChecks = computed(() =>
  (item.value?.checks ?? []).filter((check) => !check.ok).map((check) => check.detail)
)
const deciding = ref(false)
const refusing = ref(false)

async function decide(action: () => ReturnType<typeof departureAuthorizationService.grant>) {
  deciding.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.departureAuthorizations.actionError'))
  } finally {
    deciding.value = false
  }
}

function grant() {
  const no = item.value?.no
  if (no) void decide(() => departureAuthorizationService.grant(no))
}

async function refuse(reason: string) {
  refusing.value = false
  const no = item.value?.no
  if (no) await decide(() => departureAuthorizationService.refuse(no, reason))
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.departureAuthorizations.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.departureAuthorizations.saveSuccess')"
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
      <DepartureDecisionPill v-if="item" :decision="item.decision" />
    </template>
    <template v-if="showDecision" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="!item?.ready || deciding"
        :title="failedChecks.join(' ') || undefined"
        @click="grant"
      >
        <CircleCheck class="w-5 h-5 text-primary" />
        {{ t('fleet.departureAuthorizations.action.grant') }}
      </button>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="deciding"
        @click="refusing = true"
      >
        <CircleX class="w-5 h-5 text-primary" />
        {{ t('fleet.departureAuthorizations.action.refuse') }}
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
          <DepartureAuthorizationForm
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
    :open="refusing"
    :title="t('fleet.departureAuthorizations.action.refuse')"
    :label="t('fleet.departureAuthorizations.form.refusalReason')"
    :confirm-label="t('fleet.departureAuthorizations.action.refuse')"
    destructive
    :loading="deciding"
    @confirm="refuse"
    @cancel="refusing = false"
  />
</template>
