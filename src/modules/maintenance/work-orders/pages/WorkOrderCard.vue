<script lang="ts" setup>
import { computed, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Ban,
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  Factory,
  ListChecks,
  NotebookPen,
  Package,
  Play,
  ShoppingCart,
  Stethoscope,
  Undo2,
  Wrench
} from '@lucide/vue'
import type { MoreAction } from '@/components/shared/MoreActionsMenu.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { purchaseRequestService } from '@/modules/maintenance/purchase-requests'
import { stockItemService, type StockItemApi } from '@/modules/maintenance/stock-items'
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
  | 'nomenclature'
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

/** The stock of the part picked in the dialog, read from the store before taking or buying it. */
const stock = ref<StockItemApi | null>(null)
watch(
  () => part.value.itemNo,
  async (itemNo) => {
    stock.value = itemNo ? await stockItemService.getById(itemNo).catch(() => null) : null
  }
)
const stockShort = computed(
  () =>
    dialog.value === 'takePart' &&
    !!stock.value &&
    (part.value.quantity ?? 0) > stock.value.stockQuantity
)

/** A missing part is bought: the same part and quantity go into a purchase request. */
function buyMissingPart() {
  part.value = { ...part.value, label: stock.value?.name ?? '' }
  dialog.value = 'buyPart'
}

const canConfirmNomenclature = computed(
  () => canExecute.value && !!item.value?.nomenclature && !item.value.nomenclature.confirmedAt
)
const nomenclatureSubsystemNo = ref('')
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
  nomenclatureSubsystemNo.value = order?.nomenclature?.proposedSubsystemNo ?? ''
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
      return (
        !part.value.itemNo || !part.value.quantity || part.value.quantity < 1 || stockShort.value
      )
    case 'nomenclature':
      return !nomenclatureSubsystemNo.value
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
      case 'nomenclature':
        return act('confirm-nomenclature', { subsystemNo: nomenclatureSubsystemNo.value })
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

const primaryClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed'

/**
 * Every gesture the order allows now, for the role and the status. The next step of the work
 * is shown as the main button; the others go in « Plus d'actions ».
 */
const actions = computed<(MoreAction & { icon: Component })[]>(() => {
  const order = item.value
  if (!order) return []
  const label = (key: string) => t(`maintenance.workOrders.action.${key}`)
  const onSite = canWork.value && !atGarage.value
  const completeBlocked = !order.diagnosis || !order.labour.length
  return [
    {
      key: 'validate',
      label: label('validate'),
      icon: CircleCheck,
      hidden: !(canExecute.value && awaitingValidation.value),
      disabled: !!fourEyes.value,
      title: t('maintenance.workOrders.hint.fourEyes'),
      onSelect: () => open('validate')
    },
    {
      key: 'refuse',
      label: label('refuse'),
      icon: CircleX,
      hidden: !(canExecute.value && awaitingValidation.value),
      disabled: !!fourEyes.value,
      title: t('maintenance.workOrders.hint.fourEyes'),
      onSelect: () => (reasonDialog.value = 'refuse')
    },
    {
      key: 'nomenclature',
      label: label('nomenclature'),
      icon: ListChecks,
      hidden: !canConfirmNomenclature.value,
      onSelect: () => open('nomenclature')
    },
    {
      key: 'return',
      label: label('return'),
      icon: Undo2,
      hidden: !(canWork.value && atGarage.value),
      onSelect: () => open('return')
    },
    {
      key: 'followUp',
      label: label('followUp'),
      icon: NotebookPen,
      hidden: !(canWork.value && atGarage.value),
      onSelect: () => open('followUp')
    },
    {
      key: 'start',
      label: label('start'),
      icon: Play,
      hidden: !onSite || !!order.startedAt,
      onSelect: () => void act('start')
    },
    {
      key: 'diagnose',
      label: label('diagnose'),
      icon: Stethoscope,
      hidden: !canWork.value,
      onSelect: () => open('diagnose')
    },
    {
      key: 'labour',
      label: label('labour'),
      icon: Clock,
      hidden: !onSite,
      onSelect: () => open('labour')
    },
    {
      key: 'complete',
      label: label('complete'),
      icon: Wrench,
      hidden: !onSite,
      disabled: completeBlocked,
      title: t('maintenance.workOrders.hint.completeNeeds'),
      onSelect: () => open('complete')
    },
    {
      key: 'plan',
      label: label('plan'),
      icon: CalendarClock,
      hidden: !onSite,
      onSelect: () => open('plan')
    },
    {
      key: 'takePart',
      label: label('takePart'),
      icon: Package,
      hidden: !onSite,
      onSelect: () => open('takePart')
    },
    {
      key: 'buyPart',
      label: label('buyPart'),
      icon: ShoppingCart,
      hidden: !onSite,
      onSelect: () => open('buyPart')
    },
    {
      key: 'handOver',
      label: label('handOver'),
      icon: Factory,
      hidden: !onSite || !!order.external,
      onSelect: () => open('handOver')
    },
    {
      key: 'cancel',
      label: label('cancel'),
      icon: Ban,
      hidden: !(canExecute.value && !finished.value),
      danger: true,
      onSelect: () => (reasonDialog.value = 'cancel')
    }
  ]
})

/** The next step: validate, confirm the nomenclature, take the vehicle back from the garage,
 * then start, diagnose, clock the time and declare the end. */
const primaryKey = computed(() => {
  const order = item.value
  const available = new Set(actions.value.filter((a) => !a.hidden).map((a) => a.key))
  const sequence = [
    'validate',
    'nomenclature',
    'return',
    order && !order.startedAt ? 'start' : '',
    order && !order.diagnosis ? 'diagnose' : '',
    order && !order.labour.length ? 'labour' : '',
    'complete'
  ]
  return sequence.find((key) => key && available.has(key)) ?? null
})
const primaryAction = computed(
  () => actions.value.find((action) => action.key === primaryKey.value && !action.hidden) ?? null
)
const secondaryActions = computed(() =>
  actions.value
    .filter((action) => action.key !== primaryKey.value)
    .map((action) => ({ ...action, disabled: action.disabled || acting.value }))
)
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
    :more-actions="showActions ? secondaryActions : []"
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
    <template v-if="showActions && primaryAction" #action-buttons>
      <button
        type="button"
        :class="primaryClass"
        :disabled="acting || primaryAction.disabled"
        :title="primaryAction.disabled ? primaryAction.title : undefined"
        data-testid="work-order-primary-action"
        @click="primaryAction.onSelect?.()"
      >
        <component :is="primaryAction.icon" class="w-5 h-5" />
        {{ primaryAction.label }}
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
      <template v-else-if="dialog === 'nomenclature' && item?.nomenclature">
        <p class="text-sm">
          {{ t('maintenance.workOrders.dialog.nomenclatureSource') }}
          <span class="font-medium">« {{ item.nomenclature.sourceText }} »</span>
        </p>
        <p class="text-sm text-muted-foreground">
          {{
            item.proposedSubsystemName
              ? t('maintenance.workOrders.dialog.nomenclatureProposed', {
                  name: item.proposedSubsystemName
                })
              : t('maintenance.workOrders.dialog.nomenclatureNone')
          }}
        </p>
        <BaseFormField :label="t('maintenance.workOrders.dialog.subsystem')" required>
          <ReferenceLookup
            v-model="nomenclatureSubsystemNo"
            reference-key="failureSubsystems"
            :modal-title="t('maintenance.workOrders.dialog.subsystem')"
          />
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
          <p
            v-if="stock"
            class="text-xs mt-1"
            :class="stockShort ? 'text-destructive' : 'text-muted-foreground'"
          >
            {{
              t('maintenance.workOrders.dialog.stockLevel', {
                quantity: formatNumber(stock.stockQuantity),
                threshold: formatNumber(stock.alertThreshold),
                days:
                  stock.supplierLeadTimeDays === null
                    ? '-'
                    : formatNumber(stock.supplierLeadTimeDays, 1)
              })
            }}
          </p>
          <p v-if="stockShort" class="text-xs mt-1 text-destructive">
            {{ t('maintenance.workOrders.dialog.stockShort') }}
            <button
              type="button"
              class="cursor-pointer text-primary hover:underline"
              @click="buyMissingPart"
            >
              {{ t('maintenance.workOrders.action.buyPart') }}
            </button>
          </p>
          <p v-if="dialog === 'buyPart'" class="text-xs mt-1 text-muted-foreground">
            {{ t('maintenance.workOrders.dialog.buyPartHint') }}
          </p>
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
