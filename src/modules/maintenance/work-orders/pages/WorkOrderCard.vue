<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Ban,
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  Factory,
  NotebookPen,
  Package,
  Play,
  ShoppingCart,
  Stethoscope,
  Undo2,
  Wrench
} from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { purchaseRequestService } from '@/modules/maintenance/purchase-requests'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { useReferenceStore } from '@/stores/referenceStore'
import { useUserStore } from '@/stores/user'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import { formatNumber } from '@/utils/format'
import type { WorkOrderAction } from '../api/workOrderApi'
import WorkOrderForm from '../components/WorkOrderForm.vue'
import {
  diagnosisGaps,
  fourEyesBlock,
  isAtExternalWorkshop,
  isWorkable,
  MAX_HOURS_PER_DAY
} from '../domain/workOrder'
import { workOrderService } from '../services/workOrderService'
import { useWorkOrderStore } from '../stores/workOrderStore'

const props = defineProps<{
  workOrderNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

/** Same floor as the server for the work done and the reasons. */
const MIN_TEXT = 10

const { t } = useI18n()
const store = useWorkOrderStore()
const userStore = useUserStore()
const { canUpdate, canInsert, canExecute } = usePermissions('WORKORDER')
const formRef = ref<InstanceType<typeof WorkOrderForm> | null>(null)

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
  no: () => props.workOrderNo,
  store,
  form: formRef,
  update: workOrderService.update,
  canUpdate,
  label: (record) => record.vehiclePlate,
  saveErrorFallback: t('maintenance.workOrders.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.vehiclePlate}` : t('maintenance.workOrders.card')
)

const workable = computed(() => !!item.value && isWorkable(item.value.status))
const editable = computed(() => canUpdate.value && workable.value && !item.value?.startedAt)

const showActions = computed(() => !!item.value && !isEditMode.value && !isFormDirty.value)
const canWork = computed(() => canUpdate.value && workable.value)
const atGarage = computed(() => !!item.value && isAtExternalWorkshop(item.value))
const awaitingValidation = computed(() => item.value?.status === 'awaiting_validation')
const finished = computed(
  () => item.value?.status === 'closed' || item.value?.status === 'cancelled'
)
const fourEyes = computed(() =>
  item.value
    ? fourEyesBlock(
        { code: userStore.user?.code ?? '', employeeNo: userStore.user?.employeeNo ?? null },
        item.value
      )
    : null
)

const acting = ref(false)

async function act(action: WorkOrderAction, body: Record<string, unknown> = {}) {
  const no = item.value?.no
  if (!no) return false
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await workOrderService.act(no, action, body))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('maintenance.workOrders.actionError'))
    return false
  } finally {
    acting.value = false
  }
}

/** The request is the purchasing team's record; the order shows it as a pending part line. */
async function requestPurchase() {
  const no = item.value?.no
  if (!no) return false
  acting.value = true
  saveError.value = null
  try {
    await purchaseRequestService.create({
      workOrderNo: no,
      itemNo: part.value.itemNo || null,
      label: part.value.label.trim(),
      quantity: part.value.quantity,
      estimatedAmount: part.value.estimatedAmount
    })
    store.setCurrentItem(await workOrderService.getById(no))
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('maintenance.workOrders.actionError'))
    return false
  } finally {
    acting.value = false
  }
}

type Dialog =
  | 'diagnose'
  | 'labour'
  | 'complete'
  | 'handOver'
  | 'followUp'
  | 'return'
  | 'plan'
  | 'takePart'
  | 'buyPart'
  | 'validate'
  | null
const dialog = ref<Dialog>(null)
const reasonDialog = ref<'refuse' | 'cancel' | null>(null)
const diagnosis = ref({ subsystemNo: '', modeNo: '', causeNo: '' })
const labour = ref({ technicianNo: '', date: todayIso(), hours: null as number | null })
const completion = ref({ workDone: '', odometerKm: null as number | null })
const referenceStore = useReferenceStore()
const technicians = computed(() =>
  referenceStore.getItems('technicians').filter((technician) => technician.active !== false)
)
const planning = ref({
  date: todayIso(),
  estimatedHours: null as number | null,
  technicianNos: [] as string[]
})

function toggleTechnician(no: string, picked: boolean) {
  planning.value.technicianNos = picked
    ? [...planning.value.technicianNos, no]
    : planning.value.technicianNos.filter((item) => item !== no)
}

const part = ref({
  itemNo: '',
  label: '',
  quantity: 1 as number | null,
  estimatedAmount: null as number | null
})
const external = ref({
  providerNo: '',
  handedOverAt: '',
  expectedReturnOn: '',
  quoteAmount: null as number | null,
  progress: '',
  returnedAt: '',
  finalAmount: null as number | null
})

function open(next: Dialog) {
  const order = item.value
  diagnosis.value = {
    subsystemNo: order?.diagnosis?.subsystemNo ?? '',
    modeNo: order?.diagnosis?.modeNo ?? '',
    causeNo: order?.diagnosis?.causeNo ?? ''
  }
  labour.value = { technicianNo: '', date: todayIso(), hours: null }
  completion.value = { workDone: '', odometerKm: order?.odometerKmAtOpening ?? null }
  part.value = { itemNo: '', label: '', quantity: 1, estimatedAmount: null }
  planning.value = {
    date: order?.planning?.date ?? todayIso(),
    estimatedHours: order?.planning?.estimatedHours ?? null,
    technicianNos: [...(order?.planning?.technicianNos ?? [])]
  }
  const now = nowIsoDateTime().slice(0, 16)
  external.value = {
    providerNo: order?.external?.providerNo ?? '',
    handedOverAt: now,
    expectedReturnOn: order?.external?.expectedReturnOn ?? '',
    quoteAmount: order?.external?.quoteAmount ?? null,
    progress: order?.external?.progress ?? '',
    returnedAt: now,
    finalAmount: order?.external?.quoteAmount ?? null
  }
  dialog.value = next
}

const kmTooLow = computed(
  () =>
    completion.value.odometerKm !== null &&
    completion.value.odometerKm < (item.value?.odometerKmAtOpening ?? 0)
)

const confirmDisabled = computed(() => {
  switch (dialog.value) {
    case 'diagnose':
      return (
        !item.value ||
        diagnosisGaps(item.value.maintenanceType, {
          subsystemNo: diagnosis.value.subsystemNo || null,
          modeNo: diagnosis.value.modeNo || null,
          causeNo: diagnosis.value.causeNo || null
        }).length > 0
      )
    case 'labour':
      return (
        !labour.value.technicianNo ||
        !labour.value.date ||
        !labour.value.hours ||
        labour.value.hours <= 0 ||
        labour.value.hours > MAX_HOURS_PER_DAY
      )
    case 'plan':
      return (
        !planning.value.date ||
        !planning.value.estimatedHours ||
        planning.value.estimatedHours <= 0 ||
        !planning.value.technicianNos.length
      )
    case 'takePart':
      return !part.value.itemNo || !part.value.quantity || part.value.quantity < 1
    case 'buyPart':
      return (
        (!part.value.itemNo && !part.value.label.trim()) ||
        !part.value.quantity ||
        part.value.quantity < 1
      )
    case 'handOver':
      return !external.value.providerNo || !external.value.handedOverAt
    case 'complete':
    case 'return':
      return (
        (dialog.value === 'return' && !external.value.returnedAt) ||
        completion.value.workDone.trim().length < MIN_TEXT ||
        completion.value.odometerKm === null ||
        kmTooLow.value
      )
    default:
      return false
  }
})

const dialogTitle = computed(() =>
  dialog.value ? t(`maintenance.workOrders.action.${dialog.value}`) : ''
)

async function confirm() {
  const done = await (() => {
    switch (dialog.value) {
      case 'diagnose':
        return act('diagnose', {
          subsystemNo: diagnosis.value.subsystemNo,
          modeNo: diagnosis.value.modeNo || null,
          causeNo: diagnosis.value.causeNo || null
        })
      case 'labour':
        return act('labour', labour.value)
      case 'complete':
        return act('complete', {
          workDone: completion.value.workDone.trim(),
          odometerKm: completion.value.odometerKm
        })
      case 'plan':
        return act('plan', planning.value)
      case 'takePart':
        return act('take-part', { itemNo: part.value.itemNo, quantity: part.value.quantity })
      case 'buyPart':
        return requestPurchase()
      case 'handOver':
        return act('hand-over', {
          providerNo: external.value.providerNo,
          handedOverAt: external.value.handedOverAt,
          expectedReturnOn: external.value.expectedReturnOn || null,
          quoteAmount: external.value.quoteAmount
        })
      case 'followUp':
        return act('external-progress', {
          progress: external.value.progress.trim(),
          expectedReturnOn: external.value.expectedReturnOn || null,
          quoteAmount: external.value.quoteAmount
        })
      case 'return':
        return act('return', {
          returnedAt: external.value.returnedAt,
          workDone: completion.value.workDone.trim(),
          odometerKm: completion.value.odometerKm,
          finalAmount: external.value.finalAmount
        })
      default:
        return act('validate')
    }
  })()
  if (done) dialog.value = null
}

async function confirmReason(reason: string) {
  if (reasonDialog.value && (await act(reasonDialog.value, { reason }))) reasonDialog.value = null
}

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('maintenance.workOrders.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving || acting"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('maintenance.workOrders.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="editable"
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
      <WorkOrderStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="showActions && item" #action-buttons>
      <template v-if="canWork">
        <button type="button" :class="buttonClass" :disabled="acting" @click="open('diagnose')">
          <Stethoscope class="w-5 h-5 text-primary" />
          {{ t('maintenance.workOrders.action.diagnose') }}
        </button>
        <template v-if="atGarage">
          <button type="button" :class="buttonClass" :disabled="acting" @click="open('followUp')">
            <NotebookPen class="w-5 h-5 text-primary" />
            {{ t('maintenance.workOrders.action.followUp') }}
          </button>
          <button type="button" :class="buttonClass" :disabled="acting" @click="open('return')">
            <Undo2 class="w-5 h-5 text-primary" />
            {{ t('maintenance.workOrders.action.return') }}
          </button>
        </template>
        <template v-else>
          <button
            v-if="!item.startedAt"
            type="button"
            :class="buttonClass"
            :disabled="acting"
            @click="act('start')"
          >
            <Play class="w-5 h-5 text-primary" /> {{ t('maintenance.workOrders.action.start') }}
          </button>
          <button type="button" :class="buttonClass" :disabled="acting" @click="open('labour')">
            <Clock class="w-5 h-5 text-primary" /> {{ t('maintenance.workOrders.action.labour') }}
          </button>
          <button
            type="button"
            :class="buttonClass"
            :disabled="acting || !item.diagnosis || !item.labour.length"
            :title="
              !item.diagnosis || !item.labour.length
                ? t('maintenance.workOrders.hint.completeNeeds')
                : undefined
            "
            @click="open('complete')"
          >
            <Wrench class="w-5 h-5 text-primary" />
            {{ t('maintenance.workOrders.action.complete') }}
          </button>
          <button type="button" :class="buttonClass" :disabled="acting" @click="open('plan')">
            <CalendarClock class="w-5 h-5 text-primary" />
            {{ t('maintenance.workOrders.action.plan') }}
          </button>
          <button type="button" :class="buttonClass" :disabled="acting" @click="open('takePart')">
            <Package class="w-5 h-5 text-primary" />
            {{ t('maintenance.workOrders.action.takePart') }}
          </button>
          <button type="button" :class="buttonClass" :disabled="acting" @click="open('buyPart')">
            <ShoppingCart class="w-5 h-5 text-primary" />
            {{ t('maintenance.workOrders.action.buyPart') }}
          </button>
          <button
            v-if="!item.external"
            type="button"
            :class="buttonClass"
            :disabled="acting"
            @click="open('handOver')"
          >
            <Factory class="w-5 h-5 text-primary" />
            {{ t('maintenance.workOrders.action.handOver') }}
          </button>
        </template>
      </template>
      <template v-if="canExecute && awaitingValidation">
        <button
          type="button"
          :class="buttonClass"
          :disabled="acting || !!fourEyes"
          :title="fourEyes ? t('maintenance.workOrders.hint.fourEyes') : undefined"
          @click="open('validate')"
        >
          <CircleCheck class="w-5 h-5 text-primary" />
          {{ t('maintenance.workOrders.action.validate') }}
        </button>
        <button
          type="button"
          :class="buttonClass"
          :disabled="acting || !!fourEyes"
          :title="fourEyes ? t('maintenance.workOrders.hint.fourEyes') : undefined"
          @click="reasonDialog = 'refuse'"
        >
          <CircleX class="w-5 h-5 text-primary" />
          {{ t('maintenance.workOrders.action.refuse') }}
        </button>
      </template>
      <button
        v-if="canExecute && !finished"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="reasonDialog = 'cancel'"
      >
        <Ban class="w-5 h-5 text-primary" /> {{ t('maintenance.workOrders.action.cancel') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving || acting"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <WorkOrderForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
          <WorkOrderProgressSections v-if="item" :order="item" />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ConfirmDialog
    :open="dialog !== null"
    :title="dialogTitle"
    :message="dialog === 'validate' ? t('maintenance.workOrders.dialog.validateHint') : undefined"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="confirmDisabled"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="dialog = null"
  >
    <div v-if="dialog !== 'validate'" class="space-y-3">
      <template v-if="dialog === 'diagnose'">
        <BaseFormField :label="t('maintenance.workOrders.dialog.subsystem')" required>
          <ReferenceLookup
            v-model="diagnosis.subsystemNo"
            reference-key="failureSubsystems"
            :modal-title="t('maintenance.workOrders.dialog.subsystem')"
          />
        </BaseFormField>
        <BaseFormField
          :label="t('maintenance.workOrders.dialog.mode')"
          :required="item?.maintenanceType !== 'preventive'"
        >
          <ReferenceLookup
            v-model="diagnosis.modeNo"
            reference-key="failureModes"
            :modal-title="t('maintenance.workOrders.dialog.mode')"
          />
        </BaseFormField>
        <BaseFormField
          :label="t('maintenance.workOrders.dialog.cause')"
          :required="item?.maintenanceType !== 'preventive'"
        >
          <ReferenceLookup
            v-model="diagnosis.causeNo"
            reference-key="failureCauses"
            :modal-title="t('maintenance.workOrders.dialog.cause')"
          />
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'labour'">
        <BaseFormField :label="t('maintenance.workOrders.dialog.technician')" required>
          <ReferenceLookup
            v-model="labour.technicianNo"
            reference-key="technicians"
            :modal-title="t('maintenance.workOrders.dialog.technician')"
          />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.date')" required>
          <DateFormInput v-model="labour.date" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.hours')" required>
          <FormInput
            v-model="labour.hours"
            type="number"
            :min="0.25"
            :max="MAX_HOURS_PER_DAY"
            :step="0.25"
          />
          <p class="text-xs mt-1 text-muted-foreground">
            {{ t('maintenance.workOrders.dialog.hoursHint', { max: MAX_HOURS_PER_DAY }) }}
          </p>
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'plan'">
        <BaseFormField :label="t('maintenance.workOrders.dialog.planDate')" required>
          <DateFormInput v-model="planning.date" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.estimatedHours')" required>
          <FormInput v-model="planning.estimatedHours" type="number" :min="0.25" :step="0.25" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.technicians')" required>
          <div class="space-y-1">
            <label
              v-for="technician in technicians"
              :key="technician.code"
              class="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                :checked="planning.technicianNos.includes(technician.code)"
                @change="
                  toggleTechnician(technician.code, ($event.target as HTMLInputElement).checked)
                "
              />
              {{ technician.description }}
            </label>
          </div>
          <p class="text-xs mt-1 text-muted-foreground">
            {{ t('maintenance.workOrders.dialog.techniciansHint') }}
          </p>
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'takePart' || dialog === 'buyPart'">
        <BaseFormField
          :label="t('maintenance.workOrders.dialog.stockItem')"
          :required="dialog === 'takePart'"
        >
          <ReferenceLookup
            v-model="part.itemNo"
            reference-key="stockItems"
            :modal-title="t('maintenance.workOrders.dialog.stockItem')"
          />
        </BaseFormField>
        <BaseFormField
          v-if="dialog === 'buyPart'"
          :label="t('maintenance.workOrders.dialog.partLabel')"
        >
          <FormInput v-model="part.label" :maxlength="160" />
          <p class="text-xs mt-1 text-muted-foreground">
            {{ t('maintenance.workOrders.dialog.partLabelHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.quantity')" required>
          <FormInput v-model="part.quantity" type="number" :min="1" :step="1" />
        </BaseFormField>
        <BaseFormField
          v-if="dialog === 'buyPart'"
          :label="t('maintenance.workOrders.dialog.estimatedAmount')"
        >
          <FormInput v-model="part.estimatedAmount" type="number" :min="0" />
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'handOver'">
        <BaseFormField :label="t('maintenance.workOrders.dialog.garage')" required>
          <ReferenceLookup
            v-model="external.providerNo"
            reference-key="garages"
            :modal-title="t('maintenance.workOrders.dialog.garage')"
            detail-path="/fleet/providers"
          />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.handedOverAt')" required>
          <FormInput v-model="external.handedOverAt" type="datetime-local" />
        </BaseFormField>
      </template>
      <template v-if="dialog === 'handOver' || dialog === 'followUp'">
        <BaseFormField :label="t('maintenance.workOrders.dialog.expectedReturnOn')">
          <DateFormInput v-model="external.expectedReturnOn" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.quoteAmount')">
          <FormInput v-model="external.quoteAmount" type="number" :min="0" />
        </BaseFormField>
      </template>
      <BaseFormField
        v-if="dialog === 'followUp'"
        :label="t('maintenance.workOrders.dialog.progress')"
      >
        <FormTextarea v-model="external.progress" :rows="3" :maxlength="500" />
      </BaseFormField>
      <template v-if="dialog === 'return'">
        <BaseFormField :label="t('maintenance.workOrders.dialog.returnedAt')" required>
          <FormInput v-model="external.returnedAt" type="datetime-local" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.finalAmount')">
          <FormInput v-model="external.finalAmount" type="number" :min="0" />
        </BaseFormField>
      </template>
      <template v-if="dialog === 'complete' || dialog === 'return'">
        <BaseFormField :label="t('maintenance.workOrders.dialog.workDone')" required>
          <FormTextarea v-model="completion.workDone" :rows="4" :maxlength="1000" />
          <p class="text-xs mt-1 text-muted-foreground">
            {{ t('common.minLength', { count: completion.workDone.trim().length, min: MIN_TEXT }) }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('maintenance.workOrders.dialog.odometerKm')" required>
          <FormInput v-model="completion.odometerKm" type="number" :min="0" :invalid="kmTooLow" />
          <p class="text-xs mt-1" :class="kmTooLow ? 'text-destructive' : 'text-muted-foreground'">
            {{
              t('maintenance.workOrders.dialog.odometerAtOpening', {
                km: formatNumber(item?.odometerKmAtOpening ?? 0)
              })
            }}
          </p>
        </BaseFormField>
      </template>
    </div>
  </ConfirmDialog>

  <ReasonDialog
    :open="reasonDialog !== null"
    :title="reasonDialog ? t(`maintenance.workOrders.action.${reasonDialog}`) : ''"
    :label="t('maintenance.workOrders.dialog.reason')"
    :confirm-label="t('common.confirm')"
    :min-length="MIN_TEXT"
    :loading="acting"
    :destructive="reasonDialog === 'cancel'"
    @confirm="confirmReason"
    @cancel="reasonDialog = null"
  />
</template>
