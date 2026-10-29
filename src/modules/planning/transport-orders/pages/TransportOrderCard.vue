<script lang="ts" setup>
import TransportOrderPickupPanel from '@/modules/planning/loading/components/TransportOrderPickupPanel.vue'
import LoadingListView from '@/modules/planning/loading/components/LoadingListView.vue'
import { pickupApi } from '@/modules/planning/loading/api/pickupApi'
import type { LoadingListApi } from '@/modules/planning/loading/types/pickup.types'
import { printElement } from '@/utils/printElement'
import TransportOrderDossierView from '@/modules/planning/closing/components/TransportOrderDossierView.vue'
import { dossierApi } from '@/modules/planning/closing/api/dossierApi'
import type { OrderDossierApi } from '@/modules/planning/closing/types/dossier.types'
import { FolderOpen } from '@lucide/vue'
import {
  formatDateTime as formatDateTimeShort,
  formatNumber as formatDecimal
} from '@/utils/format'
import httpClient from '@/core/api/httpClient'
import TransportOrderDisputesPanel from '../components/TransportOrderDisputesPanel.vue'
import GapQualificationPanel from '../components/GapQualificationPanel.vue'
import { confirmationService } from '@/modules/planning/customer-confirmations/services/confirmationService'
import { orderLineState } from '../domain/transportOrder'
import DeliveryNoteView from '@/modules/planning/delivery-notes/components/DeliveryNoteView.vue'
import { deliveryNoteApi } from '@/modules/planning/delivery-notes/api/deliveryNoteApi'
import type { DeliveryNoteApi } from '@/modules/planning/delivery-notes/types/deliveryNote.types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Ban,
  CalendarClock,
  ClipboardList,
  ListTree,
  Lock,
  PackageOpen,
  Route,
  Truck
} from '@lucide/vue'
import { transportOrderApi } from '../api/transportOrderApi'
import { apiErrorBody, apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import type { OrderLineAction, OrderLineChoice } from '../components/OrderLineDialog.vue'
import TransportOrderForm from '../components/TransportOrderForm.vue'
import { canCancel, canEditLines, canEditSchedule, canPlan } from '../domain/transportOrder'
import { transportOrderService } from '../services/transportOrderService'
import { useTransportOrderStore } from '../stores/transportOrderStore'
/* Load gauge, replanning and trip plan (TRS01-US08, US11, US16, US17, TRS07-US07). */
import LoadGauge from '../components/LoadGauge.vue'
import ReplanningPanel from '../components/ReplanningPanel.vue'
import RoutePlanPanel from '../components/RoutePlanPanel.vue'
import { orderPlanningService } from '../api/orderPlanningApi'
import { replanCandidate } from '../domain/replanning'
import { usePlanningCircuit } from '@/modules/planning/planning-settings'
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
/* Documents and debriefing are the delivery manager's (TRS05-US04, US05). */
const { canExecute: canFileClosing } = usePermissions('DELIVERYQUALITY')
const { canRead: canReadLoading } = usePermissions('LOADING')
/* The pickup note and the loading list follow the planned order (TRS03-US03, US06). */
const LOADING_STATUSES = ['planned', 'confirmed', 'ready']
const loadingList = ref<LoadingListApi | null>(null)
/* The old « simulate the loading » shows the same list with the place of each recipient. */
const simulating = ref(false)
const listView = ref<InstanceType<typeof LoadingListView> | null>(null)
async function openLoadingList(simulate = false) {
  simulating.value = simulate
  const no = item.value?.no
  if (!no) return
  try {
    loadingList.value = await pickupApi.loadingList(no)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  }
}
function printLoadingList() {
  printElement(
    listView.value?.root ?? null,
    t('planning.loadingList.title', { no: loadingList.value?.orderNo ?? '' })
  )
}
/* The complete file of the order in one place, to read or print (TRS02-US07, TRS05-US04). */
const { canRead: canReadDossier } = usePermissions('DELIVERYQUALITY')
const orderDossier = ref<OrderDossierApi | null>(null)
const dossierView = ref<InstanceType<typeof TransportOrderDossierView> | null>(null)
async function openDossier() {
  const no = item.value?.no
  if (!no) return
  try {
    orderDossier.value = await dossierApi.ofOrder(no)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  }
}
function printDossier() {
  printElement(
    dossierView.value?.root ?? null,
    t('planning.dossier.title', { no: orderDossier.value?.order.no ?? '' })
  )
}
async function onPickupChanged() {
  const no = item.value?.no
  if (no) store.setCurrentItem(await transportOrderService.getById(no))
}
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
/* The delivery notes of the order, read by the planner (TRS05-US03). */
const deliveryNotes = ref<DeliveryNoteApi[]>([])
const dialogError = ref<string | null>(null)
/** A warning the planner may override (excess of capacity, overlap in the calendar). */
const warning = ref<{ message: string; retry: () => Promise<void> } | null>(null)

const expandedSections = ref({
  means: true,
  lines: true,
  compartments: true,
  closing: true,
  deliveryNotes: true,
  pickup: true,
  disputes: true,
  returns: true,
  satisfaction: true,
  replan: true,
  routePlan: false,
  history: false,
  audit: false
})

/** Runs one server step, then reloads the order, the list and the closing dossier. */
async function perform(
  step: (no: string) => Promise<TransportOrderApi | void>,
  retryWithForce?: () => Promise<void>
): Promise<boolean> {
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
    if (retryWithForce && apiErrorBody(error)?.errorCode === 'PLANNING_WARNINGS') {
      warning.value = {
        message: apiErrorMessage(error, t('planning.transportOrders.saveError')),
        retry: retryWithForce
      }
      return false
    }
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
    dialogError.value = saveError.value
    return false
  } finally {
    acting.value = false
  }
}

/* While the order runs, the estimated arrival follows the vehicle, and a delay shows (TRS02-US01). */
const eta = ref<{ expectedArrival: string | null; late: boolean; delayMin: number | null } | null>(
  null
)

async function loadClosing() {
  const current = item.value
  eta.value =
    current?.status === 'in_progress'
      ? await httpClient
          .get<{
            data: { expectedArrival: string | null; late: boolean; delayMin: number | null }
          }>(`/planning/transport-orders/${encodeURIComponent(current.no)}/eta`)
          .then((response) => response.data.data)
          .catch(() => null)
      : null
  // The delivery notes are planned with the order and open at the declaration (TRS01-US23).
  deliveryNotes.value =
    current && current.means && current.status !== 'cancelled'
      ? await deliveryNoteApi.ofOrder(current.no).catch(() => [])
      : []
  if (!current || (current.status !== 'in_progress' && current.status !== 'completed')) {
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
  const done = await perform(
    (no) => transportOrderService.act(no, 'plan', body),
    () => plan({ ...body, force: true })
  )
  if (done) planning.value = false
}

async function saveLines(lines: TransportOrderLineInput[], force = false) {
  const done = await perform(
    (no) => transportOrderService.replaceLines(no, lines, force),
    () => saveLines(lines, true)
  )
  if (done) editingLines.value = false
}

async function overrideWarning() {
  const pending = warning.value
  warning.value = null
  await pending?.retry()
}

async function reorderLines(lineNos: number[]) {
  await perform((no) => transportOrderService.reorderLines(no, lineNos))
}

/* The delivery order proposed by proximity, applied at once and still changeable by hand. */
async function proposeSequence() {
  await perform(async (no) => {
    const lineNos = (await transportOrderApi.proposedSequence(no)).data.data
    return transportOrderService.reorderLines(no, lineNos)
  })
}

async function cancel(choice: { reasonNo: string; comment: string }) {
  if (await perform((no) => transportOrderService.act(no, 'cancel', choice))) {
    cancelling.value = false
  }
}

/* Replanning: the recipient's date accepted, a date proposed to him, or a date chosen for a
 * remainder; the line goes to the pending order of that day (TRS01-US16, US17). */
const replanLine = (line: TransportOrderLineApi, date: string | null) =>
  perform(async (no) => {
    await orderPlanningService.replan(no, line.lineNo, date)
  })
const proposeReplan = (line: TransportOrderLineApi, date: string) =>
  perform((no) => orderPlanningService.proposeReplanDate(no, line.lineNo, date))
const toReplan = computed(
  () =>
    item.value?.lines.filter((line) => replanCandidate(line) || line.replannedToOrderNo).length ?? 0
)
/* The trip plan and its corridor, and a change of route on the road (TRS01-US11). */
const validateRoute = (corridorKm: number) =>
  perform((no) => orderPlanningService.validateRoutePlan(no, corridorKm))
const changeRoute = (routeTemplateNo: string, reason: string) =>
  perform((no) => orderPlanningService.changeRoute(no, routeTemplateNo, reason))
/* An order past its date is rescheduled before it can be loaded (TRS07-US07). */
const rescheduling = ref(false)
const newDeparture = ref('')
const { circuit } = usePlanningCircuit()
/** The reference of each line's order, printed on the loading list (TRS01-US06). */
const lineReferences = computed(() =>
  Object.fromEntries(
    (item.value?.lines ?? [])
      .filter((line) => line.externalReference)
      .map((line) => [line.lineNo, line.externalReference])
  )
)
async function reschedule() {
  if (!newDeparture.value) return
  if (await perform((no) => orderPlanningService.reschedule(no, newDeparture.value))) {
    rescheduling.value = false
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

/* Indicators by line, to decide on completing the order (TRS05-US06). */
const lineProgress = computed(() => {
  const lines = item.value?.lines ?? []
  const pending = lines.filter((line) => orderLineState(line) === 'pending').length
  return { done: lines.length - pending, pending }
})
const linesSummary = computed(() => {
  const order = item.value
  if (!order) return []
  const summary = [t('planning.transportOrders.lines.count', order.lineCount)]
  if (order.status === 'in_progress' || order.status === 'completed') {
    summary.push(
      t('planning.transportOrders.lines.done', lineProgress.value.done),
      t('planning.transportOrders.lines.pending', lineProgress.value.pending)
    )
  }
  return summary
})
const disputes = computed(() => item.value?.lines.filter((line) => line.receptionContestedAt) ?? [])
/* The quantity gaps the declarations revealed, to qualify (TRS03-US17). */
const gapLines = computed(
  () =>
    item.value?.lines.filter((line) => line.quantityGap !== null && line.quantityGap !== 0) ?? []
)
/* The goods coming back, with the recipient and the reason, and the warehouse's check (TRS04-US01). */
const returnLines = computed(
  () =>
    item.value?.lines.filter(
      (line) =>
        line.refusalAt || line.returnedAt || line.undeliveredReasonNo || line.warehouseReceivedAt
    ) ?? []
)
const disputesOpen = computed(() => disputes.value.filter((line) => !line.contestHandledAt).length)
const disputeError = ref<string | null>(null)
async function handleDispute(line: TransportOrderLineApi, note: string) {
  disputeError.value = null
  const done = await perform((no) =>
    confirmationService.receive({ orderNo: no, lineNo: line.lineNo }, 'handle-contest', { note })
  )
  if (!done) disputeError.value = saveError.value
}
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
      <span
        v-if="eta?.expectedArrival"
        class="text-xs ml-2"
        :class="eta.late ? 'text-warning font-medium' : 'text-muted-foreground'"
      >
        {{ t('planning.tracking.eta') }} {{ formatDateTimeShort(eta.expectedArrival) }}
        <template v-if="eta.late">
          · {{ t('planning.transportOrders.late', { minutes: eta.delayMin }) }}
        </template>
      </span>
    </template>
    <template v-if="item && !isEditMode && !isFormDirty" #action-buttons>
      <button
        v-if="canUpdate && canPlan(item.status)"
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
        v-if="canExecute && item.status === 'in_progress'"
        type="button"
        :class="buttonClass"
        :disabled="acting || !!closingBlocked"
        :title="closingBlocked || undefined"
        @click="closeOrder"
      >
        <Lock class="w-5 h-5 text-primary" />
        {{ t('planning.transportOrders.action.close') }}
        <span class="text-xs text-muted-foreground tabular-nums">
          {{
            t('planning.transportOrders.lines.progress', {
              done: lineProgress.done,
              total: lineProgress.done + lineProgress.pending
            })
          }}
        </span>
      </button>
      <button
        v-if="LOADING_STATUSES.includes(item.status)"
        type="button"
        :class="buttonClass"
        @click="openLoadingList(false)"
      >
        <ClipboardList class="w-5 h-5 text-primary" />
        {{ t('planning.loadingList.open') }}
      </button>
      <button
        v-if="LOADING_STATUSES.includes(item.status)"
        type="button"
        :class="buttonClass"
        @click="openLoadingList(true)"
      >
        <PackageOpen class="w-5 h-5 text-primary" />
        {{ t('planning.loadingList.simulate') }}
      </button>
      <button v-if="canReadDossier" type="button" :class="buttonClass" @click="openDossier">
        <FolderOpen class="w-5 h-5 text-primary" />
        {{ t('planning.dossier.open') }}
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
          <div
            v-if="item?.expired"
            class="mx-6 mt-4 rounded border border-warning/50 bg-warning/10 px-4 py-3 text-sm flex flex-wrap items-center gap-3"
          >
            <p class="flex-1 min-w-60 text-card-foreground">
              {{
                circuit.expiredDateMode === 'block'
                  ? t('planning.transportOrders.expired.blocked')
                  : t('planning.transportOrders.expired.alert')
              }}
            </p>
            <button
              v-if="canUpdate"
              type="button"
              :class="buttonClass"
              :disabled="acting"
              @click="((newDeparture = ''), (rescheduling = true))"
            >
              <CalendarClock class="w-4 h-4 text-primary" />
              {{ t('planning.transportOrders.expired.reschedule') }}
            </button>
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
              <div class="xl:col-span-2 min-w-0 max-w-xl">
                <p class="text-sm font-medium text-card-foreground mb-2">
                  {{ t('planning.transportOrders.gauge.title') }}
                </p>
                <LoadGauge
                  :fill="item.fill"
                  :capacity="item.capacity"
                  :weight-kg="item.totalWeightKg"
                  :volume-m3="item.totalVolumeM3"
                  :liters="item.totalFuelL"
                />
              </div>
            </FormSection>
            <FormSection
              v-model:open="expandedSections.lines"
              :title="t('planning.transportOrders.form.lines')"
              :summary="linesSummary"
            >
              <div class="xl:col-span-2 min-w-0">
                <div
                  v-if="canUpdate && canEditLines(item.status) && item.lines.length > 1"
                  class="flex justify-end mb-2"
                >
                  <button
                    type="button"
                    :class="buttonClass"
                    :disabled="acting"
                    @click="proposeSequence"
                  >
                    <Route class="w-4 h-4 text-primary" />
                    {{ t('planning.transportOrders.lines.proposeSequence') }}
                  </button>
                </div>
                <TransportOrderLinesTable
                  :lines="item.lines"
                  :status="item.status"
                  :total-weight-kg="item.totalWeightKg"
                  :can-act="canExecute && !isEditMode"
                  :can-replan="canUpdate && !isEditMode"
                  :driver-declares="item.means === 'fleet'"
                  :busy="acting"
                  :reorderable="canUpdate && canEditLines(item.status)"
                  @reorder="reorderLines"
                  @declare="(line) => openLineAction('declare', line)"
                  @hand-back="(line) => openLineAction('handBack', line)"
                  @remainder="(line) => openLineAction('remainder', line)"
                />
              </div>
            </FormSection>
            <FormSection
              v-if="toReplan"
              v-model:open="expandedSections.replan"
              :title="t('planning.transportOrders.replan.title')"
              :summary="[t('planning.transportOrders.replan.count', toReplan)]"
            >
              <ReplanningPanel
                :lines="item.lines"
                :can-replan="canUpdate && !isEditMode"
                :busy="acting"
                @replan="replanLine"
                @propose="proposeReplan"
              />
            </FormSection>
            <FormSection
              v-if="item.routePlan || item.routeHistory.length"
              v-model:open="expandedSections.routePlan"
              :title="t('planning.transportOrders.routePlan.title')"
              :summary="[item.routePlan?.routeName ?? '']"
            >
              <RoutePlanPanel
                :order="item"
                :can-edit="canUpdate && !isEditMode"
                :busy="acting"
                @validate="validateRoute"
                @change="changeRoute"
              />
            </FormSection>
            <FormSection
              v-if="item.compartmentPlan"
              v-model:open="expandedSections.compartments"
              :title="t('planning.transportOrders.compartments.title')"
              :summary="[
                item.compartmentPlan.issues.length
                  ? t(
                      'planning.transportOrders.compartments.issues',
                      item.compartmentPlan.issues.length
                    )
                  : ''
              ]"
            >
              <div class="xl:col-span-2 min-w-0">
                <p class="text-xs text-muted-foreground mb-2">
                  {{ t('planning.transportOrders.compartments.hint') }}
                </p>
                <CompartmentPlanTable :plan="item.compartmentPlan" />
              </div>
            </FormSection>
            <FormSection
              v-if="
                canReadLoading &&
                item.means &&
                [...LOADING_STATUSES, 'in_progress', 'completed'].includes(item.status)
              "
              v-model:open="expandedSections.pickup"
              :title="t('planning.pickup.section')"
              :summary="[]"
            >
              <TransportOrderPickupPanel
                :order-no="item.no"
                :order-status="item.status"
                :fleet="item.means === 'fleet'"
                @changed="onPickupChanged"
              />
            </FormSection>
            <FormSection
              v-if="gapLines.length"
              v-model:open="expandedSections.returns"
              :title="t('planning.transportOrders.gaps.title')"
              :summary="[]"
            >
              <GapQualificationPanel
                :order-no="item.no"
                :lines="gapLines"
                :can-qualify="canFileClosing"
                @changed="onPickupChanged"
              />
            </FormSection>
            <FormSection
              v-if="returnLines.length"
              v-model:open="expandedSections.returns"
              :title="t('planning.transportOrders.returns.title')"
              :summary="[t('planning.transportOrders.lines.count', returnLines.length)]"
            >
              <div
                class="xl:col-span-2 min-w-0 rounded border border-border divide-y divide-border text-sm"
              >
                <div v-for="line in returnLines" :key="line.lineNo" class="px-3 py-2 space-y-0.5">
                  <p class="font-medium text-card-foreground">
                    {{ line.recipientName }} · {{ line.productName }} ·
                    {{ formatDecimal(line.loadedQuantity ?? line.quantity) }} {{ line.unit }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ t('planning.transportOrders.returns.reason') }} :
                    {{ line.returnReasonName || '-' }}
                  </p>
                  <p class="text-xs">
                    <template v-if="line.warehouseReceivedAt">
                      <span :class="line.warehouseConforming ? 'text-success' : 'text-destructive'">
                        {{
                          line.warehouseConforming
                            ? t('planning.transportOrders.returns.conforming')
                            : t('planning.transportOrders.returns.nonconforming', {
                                reason: line.returnNonconformityReasonName || '-'
                              })
                        }}
                      </span>
                    </template>
                    <template v-else-if="line.handedBackAt">
                      {{ t('planning.transportOrders.returns.handedBack') }}
                    </template>
                    <template v-else>{{ t('planning.transportOrders.returns.onBoard') }}</template>
                  </p>
                </div>
              </div>
            </FormSection>
            <FormSection
              v-if="disputes.length"
              v-model:open="expandedSections.disputes"
              :title="t('planning.transportOrders.disputes.title')"
              :summary="[
                disputesOpen
                  ? t('planning.transportOrders.disputes.openCount', disputesOpen)
                  : t('planning.transportOrders.disputes.allHandled')
              ]"
            >
              <TransportOrderDisputesPanel
                :lines="item.lines"
                :can-handle="canUpdate && item.status === 'in_progress'"
                :busy="acting"
                :error="disputeError"
                @handle="handleDispute"
              />
            </FormSection>
            <FormSection
              v-if="
                item.lines.some((line) => line.satisfactionScore !== null) ||
                item.ordererSurveys.length
              "
              v-model:open="expandedSections.satisfaction"
              :title="t('planning.transportOrders.satisfaction.title')"
              :summary="[]"
            >
              <div class="xl:col-span-2 grid gap-3 lg:grid-cols-2 min-w-0 text-sm">
                <div class="rounded border border-border p-3 space-y-1">
                  <p class="font-medium">
                    {{ t('planning.transportOrders.satisfaction.recipients') }}
                  </p>
                  <p
                    v-for="line in item.lines.filter((l) => l.satisfactionScore !== null)"
                    :key="line.lineNo"
                  >
                    {{ line.recipientName }}
                    <span class="text-warning">{{ '★'.repeat(line.satisfactionScore ?? 0) }}</span>
                    <span v-if="line.satisfactionComment" class="text-muted-foreground">
                      · {{ line.satisfactionComment }}
                    </span>
                  </p>
                  <p
                    v-if="!item.lines.some((l) => l.satisfactionScore !== null)"
                    class="text-muted-foreground"
                  >
                    {{ t('planning.transportOrders.satisfaction.none') }}
                  </p>
                </div>
                <div class="rounded border border-border p-3 space-y-1">
                  <p class="font-medium">
                    {{ t('planning.transportOrders.satisfaction.orderers') }}
                  </p>
                  <div v-for="survey in item.ordererSurveys" :key="survey.requestNo">
                    <p>{{ survey.ordererName }} · {{ survey.requestNo }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ t('planning.deliveryRequests.survey.orderScore') }}
                      {{ survey.orderScore }}/5 ·
                      {{ t('planning.deliveryRequests.survey.delayScore') }}
                      {{ survey.delayScore }}/5 ·
                      {{ t('planning.deliveryRequests.survey.qualityScore') }}
                      {{ survey.qualityScore }}/5
                    </p>
                    <p v-if="survey.comment" class="text-xs">{{ survey.comment }}</p>
                  </div>
                  <p v-if="!item.ordererSurveys.length" class="text-muted-foreground">
                    {{ t('planning.transportOrders.satisfaction.none') }}
                  </p>
                </div>
              </div>
            </FormSection>
            <FormSection
              v-if="deliveryNotes.length"
              v-model:open="expandedSections.deliveryNotes"
              :title="t('planning.deliveryNote.sectionTitle')"
              :summary="[t('planning.deliveryNote.count', deliveryNotes.length)]"
            >
              <div class="xl:col-span-2 grid gap-3 lg:grid-cols-2 min-w-0">
                <DeliveryNoteView
                  v-for="note in deliveryNotes"
                  :key="note.deliveryPointNo"
                  :note="note"
                  printable
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
                :editable="canFileClosing && item.status === 'in_progress'"
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

  <ConfirmDialog
    :open="rescheduling"
    :title="t('planning.transportOrders.expired.reschedule')"
    :confirm-disabled="!newDeparture"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="reschedule"
    @cancel="rescheduling = false"
  >
    <BaseFormField :label="t('planning.transportOrders.form.plannedDeparture')" required>
      <FormInput v-model="newDeparture" type="datetime-local" />
    </BaseFormField>
    <FormAlerts class="mt-2" :error="dialogError" @clear:error="dialogError = null" />
  </ConfirmDialog>
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
  <ConfirmDialog
    :open="!!warning"
    :title="t('planning.transportOrders.warning.title')"
    :message="warning?.message ?? ''"
    :confirm-label="t('planning.transportOrders.warning.override')"
    :loading="acting"
    @confirm="overrideWarning"
    @cancel="warning = null"
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
  <ConfirmDialog
    :open="!!loadingList"
    :title="t('planning.loadingList.open')"
    :confirm-label="t('planning.pickup.print')"
    panel-class="max-w-2xl"
    @confirm="printLoadingList"
    @cancel="loadingList = null"
  >
    <LoadingListView
      v-if="loadingList"
      ref="listView"
      :list="loadingList"
      :simulate="simulating"
      :references="lineReferences"
    />
  </ConfirmDialog>
  <ConfirmDialog
    :open="!!orderDossier"
    :title="t('planning.dossier.open')"
    :confirm-label="t('planning.dossier.print')"
    panel-class="max-w-4xl"
    @confirm="printDossier"
    @cancel="orderDossier = null"
  >
    <TransportOrderDossierView v-if="orderDossier" ref="dossierView" :dossier="orderDossier" />
  </ConfirmDialog>
</template>
