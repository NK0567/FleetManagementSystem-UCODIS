<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, CircleX, Undo2 } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { useUserStore } from '@/stores/user'
import LeaveRequestForm from '../components/LeaveRequestForm.vue'
import {
  canDecide,
  decisionNeedsComment,
  MIN_DECISION_COMMENT_LENGTH,
  type LeaveRequestDecision
} from '../domain/leaveRequestStatus'
import { leaveRequestService } from '../services/leaveRequestService'
import { useLeaveRequestStore } from '../stores/leaveRequestStore'

const props = defineProps<{
  requestNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useLeaveRequestStore()
const userStore = useUserStore()
const { canInsert, canExecute } = usePermissions('LEAVEREQUEST')
const formRef = ref<InstanceType<typeof LeaveRequestForm> | null>(null)

/** A submitted request is never edited: it is decided, or sent back and submitted again. */
const canUpdate = computed(() => false)

const {
  item,
  isLoading,
  errorMsg,
  isEditMode,
  isSaving,
  saveError,
  saveSuccess,
  validationErrors,
  hasPrev,
  hasNext,
  sidebarItems,
  goTo,
  goToPrev,
  goToNext
} = useEntityCard({
  no: () => props.requestNo,
  store,
  form: formRef,
  update: leaveRequestService.update,
  canUpdate,
  label: (request) => request.employeeName,
  saveErrorFallback: t('hr.leaveRequests.decisionError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.employeeName}` : t('hr.leaveRequests.card')
)

/** Nobody decides on their own leave; the server refuses it as well. */
const canDecideHere = computed(
  () =>
    canExecute.value &&
    !!item.value &&
    canDecide(item.value.status) &&
    item.value.employeeNo !== userStore.user?.employeeNo
)

const pendingDecision = ref<LeaveRequestDecision | null>(null)
const deciding = ref(false)

const DECISION_LABELS: Record<LeaveRequestDecision, string> = {
  approve: 'hr.leaveRequests.action.approve',
  'send-back': 'hr.leaveRequests.action.sendBack',
  reject: 'hr.leaveRequests.action.reject'
}

async function decide(comment: string) {
  const decision = pendingDecision.value
  if (!item.value || !decision) return
  deciding.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await leaveRequestService.decide(item.value.no, decision, comment))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    pendingDecision.value = null
  } catch (error) {
    pendingDecision.value = null
    saveError.value = apiErrorMessage(error, t('hr.leaveRequests.decisionError'))
  } finally {
    deciding.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('hr.leaveRequests.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || deciding"
    :actions-disabled="isLoading || deciding"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('hr.leaveRequests.createSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="false"
    :show-title-new-button="canInsert"
    @close="emit('close')"
    @go-prev="goToPrev"
    @go-next="goToNext"
    @select-sidebar="goTo"
    @create="emit('create')"
    @clear-save-error="saveError = null"
  >
    <template #title-badges>
      <LeaveRequestStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="canDecideHere" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="deciding"
        @click="pendingDecision = 'approve'"
      >
        <CircleCheck class="w-5 h-5 text-primary" /> {{ t('hr.leaveRequests.action.approve') }}
      </button>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="deciding"
        @click="pendingDecision = 'send-back'"
      >
        <Undo2 class="w-5 h-5 text-primary" /> {{ t('hr.leaveRequests.action.sendBack') }}
      </button>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="deciding"
        @click="pendingDecision = 'reject'"
      >
        <CircleX class="w-5 h-5 text-primary" /> {{ t('hr.leaveRequests.action.reject') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || deciding"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto">
          <LeaveRequestForm
            ref="formRef"
            :initial-data="item ?? {}"
            disabled
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ReasonDialog
    :open="!!pendingDecision"
    :title="pendingDecision ? t(DECISION_LABELS[pendingDecision]) : ''"
    :label="t('hr.leaveRequests.form.decisionComment')"
    :confirm-label="pendingDecision ? t(DECISION_LABELS[pendingDecision]) : undefined"
    :min-length="
      pendingDecision && decisionNeedsComment(pendingDecision) ? MIN_DECISION_COMMENT_LENGTH : 0
    "
    :destructive="pendingDecision === 'reject'"
    :loading="deciding"
    @confirm="decide"
    @cancel="pendingDecision = null"
  />
</template>
