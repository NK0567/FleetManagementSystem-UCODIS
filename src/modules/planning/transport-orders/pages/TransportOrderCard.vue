<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, CalendarClock, ListTree } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { fileApi } from '@/core/api/fileApi'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { useListCellFormatters } from '@/composables/useListCellFormatters'
import { usePermissions } from '@/composables/usePermissions'
import { formatNumber } from '@/utils/format'
import type { TransportOrderAction } from '../api/transportOrderApi'
import { transportOrderApi } from '../api/transportOrderApi'
import TransportOrderForm from '../components/TransportOrderForm.vue'
import { canCancel, canEditLines, canPlan } from '../domain/transportOrder'
import { transportOrderService } from '../services/transportOrderService'
import { useTransportOrderStore } from '../stores/transportOrderStore'
import type { TransportOrderLineInput } from '../types/transportOrder.types'

const props = defineProps<{
  transportOrderNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useTransportOrderStore()
const { canUpdate, canInsert, canExecute } = usePermissions('TRANSPORTORDER')
const { formatDateTime } = useListCellFormatters()
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
const declaring = ref(false)
const cancelling = ref(false)
const remaining = ref(false)
const remainderDate = ref('')
const voucherNo = ref('')
const documentKind = ref('loading_list')
const closing = ref<{ blocks: string[]; documents: { kind: string }[] } | null>(null)
const receivedQuantity = ref<number | null>(null)
const dialogError = ref<string | null>(null)

async function refresh(updated: Awaited<ReturnType<typeof transportOrderService.act>>) {
  store.setCurrentItem(updated)
  await store.fetchItems(store.pagination.page, store.pagination.limit)
}

async function run(action: TransportOrderAction, body: Record<string, unknown> = {}) {
  const no = item.value?.no
  if (!no) return false
  acting.value = true
  saveError.value = null
  try {
    await refresh(await transportOrderService.act(no, action, body))
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
    dialogError.value = saveError.value
    return false
  } finally {
    acting.value = false
  }
}

async function plan(body: Record<string, unknown>) {
  dialogError.value = null
  if (await run('plan', body)) planning.value = false
}

async function saveLines(lines: TransportOrderLineInput[]) {
  const no = item.value?.no
  if (!no) return
  acting.value = true
  dialogError.value = null
  saveError.value = null
  try {
    await refresh(await transportOrderService.replaceLines(no, lines))
    editingLines.value = false
  } catch (error) {
    dialogError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
    saveError.value = dialogError.value
  } finally {
    acting.value = false
  }
}

async function depart() {
  const no = item.value?.no
  if (!no) return
  acting.value = true
  saveError.value = null
  try {
    await transportOrderApi.depart(no)
    await refresh(await transportOrderService.getById(no))
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  } finally {
    acting.value = false
  }
}

async function declare() {
  const current = item.value
  const line = current?.lines.find((item) => !item.declaredAt && !item.refusalAt && !item.returnedAt)
  if (!current || !line || receivedQuantity.value === null) return
  acting.value = true
  saveError.value = null
  try {
    await transportOrderApi.declareLine(current.no, line.lineNo, receivedQuantity.value)
    await refresh(await transportOrderService.getById(current.no))
    declaring.value = false
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  } finally {
    acting.value = false
  }
}

function lineToHandBack() {
  return item.value?.lines.find(
    (line) => (line.refusalAt || line.returnedAt) && !line.handedBackAt && !line.warehouseReceivedAt
  )
}

function lineToReplan() {
  return item.value?.lines.find((line) => {
    if (!line.declaredAt || line.receivedQuantity === null || line.remainderAt) return false
    return (line.loadedQuantity ?? line.quantity) - line.receivedQuantity > 0
  })
}

async function handBack() {
  const current = item.value
  const line = lineToHandBack()
  if (!current || !line) return
  acting.value = true
  saveError.value = null
  try {
    await transportOrderApi.handBack(current.no, line.lineNo)
    await refresh(await transportOrderService.getById(current.no))
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  } finally {
    acting.value = false
  }
}

async function saveRemainder() {
  const current = item.value
  const line = lineToReplan()
  if (!current || !line || !remainderDate.value) return
  acting.value = true
  saveError.value = null
  try {
    await transportOrderApi.remainder(current.no, line.lineNo, remainderDate.value)
    await refresh(await transportOrderService.getById(current.no))
    remaining.value = false
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  } finally {
    acting.value = false
  }
}

async function loadClosing(no: string) {
  try {
    closing.value = (await transportOrderApi.closing(no)).data.data
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  }
}

watch(
  () => item.value?.no,
  (no) => {
    if (!no || (item.value?.status !== 'delivered' && item.value?.status !== 'closed')) {
      closing.value = null
      return
    }
    void loadClosing(no)
  }
)

async function attachDocument(event: Event) {
  const current = item.value
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!current || !file) return
  acting.value = true
  saveError.value = null
  try {
    const uploaded = (await fileApi.upload(file)).data.data
    await transportOrderApi.attachDocument(current.no, documentKind.value, uploaded.no)
    await loadClosing(current.no)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  } finally {
    acting.value = false
    input.value = ''
  }
}

async function saveDebriefing() {
  const current = item.value
  if (!current || !voucherNo.value.trim()) return
  acting.value = true
  saveError.value = null
  try {
    await transportOrderApi.saveDebriefing(current.no, voucherNo.value)
    await loadClosing(current.no)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  } finally {
    acting.value = false
  }
}

async function closeOrder() {
  const current = item.value
  if (!current) return
  acting.value = true
  saveError.value = null
  try {
    await transportOrderApi.close(current.no)
    await refresh(await transportOrderService.getById(current.no))
    await loadClosing(current.no)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
  } finally {
    acting.value = false
  }
}

async function cancel(choice: { reasonNo: string; comment: string }) {
  if (await run('cancel', choice)) cancelling.value = false
}

function weightOf(value: number | null): string {
  return formatNumber(value, 1)
}

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
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
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
        {{ t('planning.transportOrders.action.depart') }}
      </button>
      <button
        v-if="canExecute && item.status === 'in_progress'"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="((receivedQuantity = null), (declaring = true))"
      >
        {{ t('planning.transportOrders.action.declare') }}
      </button>
      <button
        v-if="canExecute && lineToHandBack()"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="handBack"
      >
        {{ t('planning.transportOrders.action.handBack') }}
      </button>
      <button
        v-if="canExecute && lineToReplan()"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="((remainderDate = ''), (remaining = true))"
      >
        {{ t('planning.transportOrders.action.remainder') }}
      </button>
      <button
        v-if="canExecute && item.status === 'delivered'"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="closeOrder"
      >
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
        <div class="flex-1 min-h-0 overflow-y-auto">
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
            :schedule-locked="item?.status !== 'draft'"
            :validation-errors="validationErrors"
          />
          <div v-if="item" class="px-4 sm:px-6 lg:px-8 pb-8 space-y-6 text-sm">
            <section>
              <h3 class="font-medium text-card-foreground mb-2">
                {{ t('planning.transportOrders.form.means') }}
              </h3>
              <p v-if="!item.means" class="text-muted-foreground">
                {{ t('planning.transportOrders.means.none') }}
              </p>
              <dl v-else-if="item.means === 'fleet'" class="grid grid-cols-2 gap-x-3 gap-y-2">
                <dt class="text-muted-foreground">
                  {{ t('planning.transportOrders.col.tripNo') }}
                </dt>
                <dd>
                  <router-link
                    v-if="item.tripNo"
                    :to="`/fleet/trips/${item.tripNo}`"
                    class="text-primary hover:underline"
                  >
                    {{ item.tripNo }}
                  </router-link>
                </dd>
                <dt class="text-muted-foreground">
                  {{ t('planning.transportOrders.form.vehicle') }}
                </dt>
                <dd>{{ item.vehiclePlate || '—' }}</dd>
                <dt class="text-muted-foreground">
                  {{ t('planning.transportOrders.form.trailer') }}
                </dt>
                <dd>{{ item.trailerPlate || '—' }}</dd>
                <dt class="text-muted-foreground">
                  {{ t('planning.transportOrders.form.driver') }}
                </dt>
                <dd>{{ item.driverName || '—' }}</dd>
              </dl>
              <dl v-else class="grid grid-cols-2 gap-x-3 gap-y-2">
                <dt class="text-muted-foreground">
                  {{ t('planning.transportOrders.form.carrier') }}
                </dt>
                <dd>{{ item.carrierName }}</dd>
                <dt class="text-muted-foreground">
                  {{ t('planning.transportOrders.form.carrierVehicle') }}
                </dt>
                <dd>{{ item.carrierVehiclePlate || '—' }}</dd>
                <dt class="text-muted-foreground">
                  {{ t('planning.transportOrders.form.carrierDriver') }}
                </dt>
                <dd>{{ item.carrierDriverName || '—' }}</dd>
              </dl>
            </section>
            <section>
              <h3 class="font-medium text-card-foreground mb-2">
                {{ t('planning.transportOrders.form.lines') }}
                <span class="font-normal text-muted-foreground">
                  · {{ t('planning.transportOrders.lines.count', item.lineCount) }}
                </span>
              </h3>
              <p v-if="!item.lines.length" class="text-muted-foreground">
                {{ t('planning.transportOrders.lines.empty') }}
              </p>
              <table v-else class="w-full text-left">
                <thead class="text-xs text-muted-foreground">
                  <tr>
                    <th class="py-1 pr-2 font-medium">
                      {{ t('planning.transportOrders.lines.col.request') }}
                    </th>
                    <th class="py-1 pr-2 font-medium">
                      {{ t('planning.transportOrders.lines.col.point') }}
                    </th>
                    <th class="py-1 pr-2 font-medium">
                      {{ t('planning.transportOrders.lines.col.product') }}
                    </th>
                    <th class="py-1 pr-2 font-medium text-right">
                      {{ t('planning.transportOrders.lines.col.quantity') }}
                    </th>
                    <th class="py-1 font-medium text-right">
                      {{ t('planning.transportOrders.lines.col.weight') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in item.lines" :key="line.lineNo" class="border-t border-border">
                    <td class="py-1.5 pr-2">
                      <router-link
                        v-if="line.deliveryRequestNo"
                        :to="`/planning/delivery-requests/${line.deliveryRequestNo}`"
                        class="text-primary hover:underline"
                      >
                        {{ line.deliveryRequestNo }}
                      </router-link>
                      <span v-else>—</span>
                    </td>
                    <td class="py-1.5 pr-2">
                      {{ line.deliveryPointName }}
                      <span v-if="line.recipientName" class="text-muted-foreground">
                        · {{ line.recipientName }}
                      </span>
                    </td>
                    <td class="py-1.5 pr-2">{{ line.productName }}</td>
                    <td class="py-1.5 pr-2 text-right">
                      {{ formatNumber(line.quantity, 1) }} {{ line.unit }}
                    </td>
                    <td class="py-1.5 text-right">{{ weightOf(line.weightKg) }}</td>
                  </tr>
                </tbody>
              </table>
            </section>
            <section v-if="closing">
              <h3 class="font-medium text-card-foreground mb-2">
                {{ t('planning.transportOrders.closing.blocks') }}
              </h3>
              <p class="text-muted-foreground">{{ closing.blocks.join(', ') || '—' }}</p>
              <p v-if="closing.documents.length" class="text-muted-foreground mt-1">
                {{ closing.documents.map((document) => document.kind).join(', ') }}
              </p>
              <div v-if="canExecute && item?.status === 'delivered'" class="mt-2 flex flex-wrap items-center gap-2">
                <FormInput v-model="documentKind" :placeholder="t('planning.transportOrders.closing.kind')" />
                <input type="file" :disabled="acting" @change="attachDocument" />
                <FormInput v-model="voucherNo" :placeholder="t('planning.transportOrders.closing.voucher')" />
                <button type="button" :class="buttonClass" :disabled="acting" @click="saveDebriefing">
                  {{ t('planning.transportOrders.action.debriefing') }}
                </button>
              </div>
            </section>
            <section>
              <h3 class="font-medium text-card-foreground mb-2">
                {{ t('planning.transportOrders.form.history') }}
              </h3>
              <ul class="space-y-1">
                <li
                  v-for="event in item.events"
                  :key="`${event.at}-${event.kind}-${event.detail}`"
                  class="text-muted-foreground"
                >
                  <span class="text-card-foreground">{{ formatDateTime(event.at) }}</span>
                  · {{ event.by }} · {{ t(`planning.transportOrders.history.${event.kind}`) }}
                  <span v-if="event.detail"> · {{ event.detail }}</span>
                </li>
              </ul>
            </section>
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
  <ConfirmDialog
    :open="declaring"
    :title="t('planning.transportOrders.action.declare')"
    :confirm-disabled="receivedQuantity === null"
    :loading="acting"
    @confirm="declare"
    @cancel="declaring = false"
  >
    <FormInput v-model="receivedQuantity" type="number" :min="0" />
  </ConfirmDialog>
  <ConfirmDialog
    :open="remaining"
    :title="t('planning.transportOrders.action.remainder')"
    :confirm-disabled="!remainderDate"
    :loading="acting"
    @confirm="saveRemainder"
    @cancel="remaining = false"
  >
    <FormInput v-model="remainderDate" type="date" />
  </ConfirmDialog>
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
