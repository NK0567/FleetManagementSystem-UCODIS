<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, CalendarClock, ListTree, Lock, Truck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import type { OrderLineAction, OrderLineChoice } from '../components/OrderLineDialog.vue'
import TransportOrderForm from '../components/TransportOrderForm.vue'
import { canCancel, canEditLines, canEditSchedule, canPlan } from '../domain/transportOrder'
import { transportOrderService } from '../services/transportOrderService'
import { useTransportOrderStore } from '../stores/transportOrderStore'
import type {
  DebriefingInput,
  TransportOrderApi,
  TransportOrderClosingApi,
  TransportOrderLineApi,
  TransportOrderLineInput
} from '../types/transportOrder.types'

const props = defineProps<{
  transportOrderNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useTransportOrderStore()
const { canUpdate, canInsert, canExecute } = usePermissions('TRANSPORTORDER')
const formRef = ref<InstanceType<typeof TransportOrderForm> | null>(null)

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
  no: () => props.transportOrderNo,
  store,
  form: formRef,
  update: transportOrderService.update,
  canUpdate,
  label: (record) => record.recipientSummary || record.routeName || record.no,
  saveErrorFallback: t('planning.transportOrders.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value
    ? `${item.value.no}${item.value.recipientSummary ? ` · ${item.value.recipientSummary}` : ''}`
    : t('planning.transportOrders.card')
)

const acting = ref(false)
const planning = ref(false)
const editingLines = ref(false)
const cancelling = ref(false)
const lineAction = ref<OrderLineAction | null>(null)
const actionLine = ref<TransportOrderLineApi | null>(null)
const closing = ref<TransportOrderClosingApi | null>(null)
const dialogError = ref<string | null>(null)

const expandedSections = ref({
  means: true,
  lines: true,
  closing: true,
  history: false,
  audit: false
})

/** Runs one server step, then reloads the order, the list and the closing dossier. */
async function perform(step: (no: string) => Promise<TransportOrderApi | void>): Promise<boolean> {
  const no = item.value?.no
  if (!no) return false
  acting.value = true
  saveError.value = null
  dialogError.value = null
  try {
    const updated = await step(no)
    store.setCurrentItem(updated ?? (await transportOrderService.getById(no)))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    await loadClosing()
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
    dialogError.value = saveError.value
    return false
  } finally {
    acting.value = false
  }
}

async function loadClosing() {
  const current = item.value
  if (!current || (current.status !== 'delivered' && current.status !== 'closed')) {
    closing.value = null
    return
  }
  try {
    closing.value = await transportOrderService.closing(current.no)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  }
}

watch(
  () => [item.value?.no, item.value?.status],
  () => void loadClosing(),
  { immediate: true }
)

async function plan(body: Record<string, unknown>) {
  if (await perform((no) => transportOrderService.act(no, 'plan', body))) planning.value = false
}

async function saveLines(lines: TransportOrderLineInput[]) {
  if (await perform((no) => transportOrderService.replaceLines(no, lines))) {
    editingLines.value = false
  }
}

async function cancel(choice: { reasonNo: string; comment: string }) {
  if (await perform((no) => transportOrderService.act(no, 'cancel', choice))) {
    cancelling.value = false
  }
}

const depart = () => perform((no) => transportOrderService.depart(no))
const closeOrder = () => perform((no) => transportOrderService.close(no))
const attachDocument = (kind: string, fileNo: string) =>
  perform((no) => transportOrderService.attachDocument(no, kind, fileNo))
const saveDebriefing = (debriefing: DebriefingInput) =>
  perform((no) => transportOrderService.saveDebriefing(no, debriefing))

function openLineAction(action: OrderLineAction, line: TransportOrderLineApi) {
  actionLine.value = line
  lineAction.value = action
}

async function confirmLineAction(choice: OrderLineChoice) {
  const line = actionLine.value
  if (!line) return
  const done = await perform((no) => {
    if (choice.action === 'declare') {
      return transportOrderService.declareLine(
        no,
        line.lineNo,
        choice.receivedQuantity,
        choice.justification
      )
    }
    if (choice.action === 'remainder') {
      return transportOrderService.remainder(no, line.lineNo, choice.date)
    }
    return transportOrderService.handBack(no, line.lineNo)
  })
  if (done) lineAction.value = null
}

const linesSummary = computed(() =>
  item.value ? [t('planning.transportOrders.lines.count', item.value.lineCount)] : []
)
const meansSummary = computed(() => {
  const order = item.value
  if (!order?.means) return [t('planning.transportOrders.means.none')]
  return order.means === 'carrier'
    ? [order.carrierName, order.carrierVehiclePlate]
    : [order.tripNo, order.vehiclePlate, order.driverName]
})

/** What still blocks the closing, read out; empty when nothing does. */
const closingBlocked = computed(() =>
  (closing.value?.blocks ?? [])
    .map((block) => t(`planning.transportOrders.closing.block.${block}`))
    .join(', ')
)

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('planning.transportOrders.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || acting"
    :actions-disabled="isLoading || isSaving || acting"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('planning.transportOrders.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canUpdate && !!item && canEditLines(item.status)"
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
      <TransportOrderStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="item && !isEditMode && !isFormDirty" #action-buttons>
      <button
        v-if="canExecute && canPlan(item.status)"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="((dialogError = null), (planning = true))"
      >
        <CalendarClock class="w-5 h-5 text-primary" />
        {{ t('planning.transportOrders.action.plan') }}
      </button>
      <button
        v-if="canUpdate && canEditLines(item.status)"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="((dialogError = null), (editingLines = true))"
      >
        <ListTree class="w-5 h-5 text-primary" />
        {{ t('planning.transportOrders.action.lines') }}
      </button>
      <button
        v-if="canExecute && item.means === 'carrier' && item.status === 'ready'"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="depart"
      >
        <Truck class="w-5 h-5 text-primary" />
        {{ t('planning.transportOrders.action.depart') }}
      </button>
      <button
        v-if="canExecute && item.status === 'delivered'"
        type="button"
        :class="buttonClass"
        :disabled="acting || !!closingBlocked"
        :title="closingBlocked || undefined"
        @click="closeOrder"
      >
        <Lock class="w-5 h-5 text-primary" />
        {{ t('planning.transportOrders.action.close') }}
      </button>
      <button
        v-if="canExecute && canCancel(item.status)"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="cancelling = true"
      >
        <Ban class="w-5 h-5 text-primary" />
        {{ t('planning.transportOrders.action.cancel') }}
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
          <div
            v-if="item?.cancelledAt"
            class="mx-6 mt-4 rounded border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            <p class="font-medium text-card-foreground">
              {{
                t('planning.transportOrders.cancelledBecause', {
                  reason: item.cancellationReasonName
                })
              }}
            </p>
            <p v-if="item.cancellationComment" class="text-muted-foreground mt-1">
              {{ item.cancellationComment }}
            </p>
          </div>
          <TransportOrderForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :schedule-locked="!!item && !canEditSchedule(item.status)"
            :validation-errors="validationErrors"
          />
          <div v-if="item" class="px-4 sm:px-6 lg:px-8 pb-6">
            <FormSection
              v-model:open="expandedSections.means"
              :title="t('planning.transportOrders.form.means')"
              :summary="meansSummary"
            >
              <div class="xl:col-span-2 min-w-0">
                <TransportOrderMeansPanel :order="item" />
              </div>
            </FormSection>
            <FormSection
              v-model:open="expandedSections.lines"
              :title="t('planning.transportOrders.form.lines')"
              :summary="linesSummary"
            >
              <div class="xl:col-span-2 min-w-0">
                <TransportOrderLinesTable
                  :lines="item.lines"
                  :status="item.status"
                  :total-weight-kg="item.totalWeightKg"
                  :can-act="canExecute && !isEditMode"
                  :busy="acting"
                  @declare="(line) => openLineAction('declare', line)"
                  @hand-back="(line) => openLineAction('handBack', line)"
                  @remainder="(line) => openLineAction('remainder', line)"
                />
              </div>
            </FormSection>
            <FormSection
              v-if="closing"
              v-model:open="expandedSections.closing"
              :title="t('planning.transportOrders.closing.title')"
              :summary="[closingBlocked || t('planning.transportOrders.closing.ready')]"
            >
              <TransportOrderClosingPanel
                :closing="closing"
                :editable="canExecute && item.status === 'delivered'"
                :busy="acting"
                @attach="attachDocument"
                @debrief="saveDebriefing"
              />
            </FormSection>
            <FormSection
              v-model:open="expandedSections.history"
              :title="t('planning.transportOrders.form.history')"
              :summary="[]"
            >
              <div class="xl:col-span-2 min-w-0">
                <TransportOrderHistory :events="item.events" />
              </div>
            </FormSection>
            <AuditFormSection v-model:open="expandedSections.audit" :record="item" />
          </div>
        </div>
      </div>
    </template>
  </CardModalShell>

  <OrderPlanDialog
    :open="planning"
    :order="item"
    :loading="acting"
    :error="dialogError"
    @confirm="plan"
    @cancel="planning = false"
  />
  <OrderLinesDialog
    :open="editingLines"
    :order="item"
    :loading="acting"
    :error="dialogError"
    @confirm="saveLines"
    @cancel="editingLines = false"
  />
  <OrderLineDialog
    :action="lineAction"
    :line="actionLine"
    :loading="acting"
    @confirm="confirmLineAction"
    @cancel="lineAction = null"
  />
  <PlanningReasonDialog
    :open="cancelling"
    :title="t('planning.transportOrders.action.cancel')"
    kind="cancellation"
    :loading="acting"
    destructive
    @confirm="cancel"
    @cancel="cancelling = false"
  />
</template>
