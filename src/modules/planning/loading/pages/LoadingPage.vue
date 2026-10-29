<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CircleCheck,
  CircleX,
  ClipboardCheck,
  PackageCheck,
  PackageOpen,
  Truck,
  Undo2
} from '@lucide/vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { usePermissions } from '@/composables/usePermissions'
import { formatDateTime, formatNumber } from '@/utils/format'
import { useLoadingStore } from '../stores/loadingStore'
import { apiErrorMessage } from '@/core/api/apiError'
import { pickupApi } from '../api/pickupApi'
import PickupConfirmDialog from '../components/PickupConfirmDialog.vue'
import type { PickupEntryInput, PickupNoteApi } from '../types/pickup.types'
import type {
  LoadingLineApi,
  LoadingLineState,
  ReasonChoice,
  ReturnLineApi
} from '../types/loading.types'

const STATE_TONES: Record<LoadingLineState, StatusTone> = {
  to_declare: 'warning',
  to_check: 'info',
  conforming: 'success'
}

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'

const { t } = useI18n()
const store = useLoadingStore()
const { canUpdate, canExecute } = usePermissions('LOADING')
/* The returns are received by the warehouse (TRS04-US01). */
const { canExecute: canReceiveReturns } = usePermissions('GOODSRETURN')

const rejecting = ref<LoadingLineApi | null>(null)
const receiving = ref<ReturnLineApi | null>(null)
const refusingReturn = ref<ReturnLineApi | null>(null)

const stateOf = (line: LoadingLineApi): LoadingLineState => {
  if (line.loadedQuantity === null) return 'to_declare'
  return line.conformingAt ? 'conforming' : 'to_check'
}

const orders = computed(() => {
  const groups = new Map<string, LoadingLineApi[]>()
  for (const line of store.lines) {
    groups.set(line.orderNo, [...(groups.get(line.orderNo) ?? []), line])
  }
  return [...groups].map(([orderNo, lines]) => ({
    orderNo,
    lines,
    checked: lines.filter((line) => stateOf(line) === 'conforming').length
  }))
})

const kpis = computed(() => [
  {
    key: 'orders',
    icon: Truck,
    value: orders.value.length,
    label: t('planning.loading.kpi.orders')
  },
  {
    key: 'toDeclare',
    icon: PackageOpen,
    value: store.lines.filter((line) => stateOf(line) === 'to_declare').length,
    label: t('planning.loading.kpi.toDeclare')
  },
  {
    key: 'toCheck',
    icon: ClipboardCheck,
    value: store.lines.filter((line) => stateOf(line) === 'to_check').length,
    label: t('planning.loading.kpi.toCheck')
  },
  {
    key: 'returns',
    icon: Undo2,
    value: store.returns.length,
    label: t('planning.loading.kpi.returns')
  }
])

const keyOf = (line: { orderNo: string; lineNo: number }) => `${line.orderNo}-${line.lineNo}`
const orderCard = (orderNo: string) => ({
  path: '/planning/transport-orders',
  query: { no: orderNo, cardMode: 'view' }
})

/* Loading is confirmed on the pickup note, with the site's data (TRS03-US04). */
const confirming = ref<PickupNoteApi | null>(null)
const confirmError = ref<string | null>(null)
const confirmBusy = ref(false)
async function openConfirm(orderNo: string) {
  confirmError.value = null
  try {
    confirming.value = await pickupApi.note(orderNo)
  } catch (cause) {
    store.error = apiErrorMessage(cause, t('planning.pickup.saveError'))
  }
}
async function onConfirmPickup(documentRef: string, entries: PickupEntryInput[]) {
  const note = confirming.value
  if (!note) return
  confirmBusy.value = true
  confirmError.value = null
  try {
    await pickupApi.confirm(note.orderNo, documentRef, entries)
    confirming.value = null
    await store.fetchAll()
  } catch (cause) {
    confirmError.value = apiErrorMessage(cause, t('planning.pickup.saveError'))
  } finally {
    confirmBusy.value = false
  }
}

async function onReject(choice: ReasonChoice) {
  if (rejecting.value && (await store.nonconform(rejecting.value, choice))) rejecting.value = null
}

async function onReceive() {
  if (receiving.value && (await store.receiveReturn(receiving.value))) receiving.value = null
}

async function onRefuseReturn(choice: ReasonChoice) {
  if (refusingReturn.value && (await store.rejectReturn(refusingReturn.value, choice))) {
    refusingReturn.value = null
  }
}

onMounted(() => void store.fetchAll())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">{{ t('planning.loading.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.loading.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" @clear:error="store.error = null" />
    <LoadingBar v-if="store.loading" :height="2" bar-color="var(--color-primary)" />

    <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <div
        v-for="kpi in kpis"
        :key="kpi.key"
        class="bg-card border border-border rounded p-4 flex items-start gap-3"
      >
        <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
          <component :is="kpi.icon" class="w-5 h-5" />
        </span>
        <div class="min-w-0">
          <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
          <p class="text-2xl font-semibold tabular-nums text-card-foreground">{{ kpi.value }}</p>
        </div>
      </div>
    </section>

    <section
      v-if="!orders.length"
      class="bg-card border border-border rounded p-4 text-sm text-muted-foreground"
    >
      {{ store.loading ? t('planning.loading.loading') : t('planning.loading.empty') }}
    </section>

    <section
      v-for="order in orders"
      :key="order.orderNo"
      class="bg-card border border-border rounded overflow-x-auto"
    >
      <div
        class="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2"
      >
        <h2 class="text-sm font-semibold text-card-foreground flex items-center gap-2">
          <RouterLink :to="orderCard(order.orderNo)" class="text-primary hover:underline">
            {{ order.orderNo }}
          </RouterLink>
          <span class="text-xs font-normal text-muted-foreground">
            {{
              t('planning.loading.checkedCount', {
                checked: order.checked,
                total: order.lines.length
              })
            }}
          </span>
        </h2>
        <button
          v-if="canUpdate && order.lines.some((line) => line.loadedQuantity === null)"
          type="button"
          :class="buttonClass"
          :disabled="store.acting"
          @click="openConfirm(order.orderNo)"
        >
          <PackageCheck class="w-5 h-5 text-primary" />
          {{ t('planning.pickup.confirm') }}
        </button>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold text-left">{{ t('planning.loading.col.line') }}</th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.loading.col.recipient') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.loading.col.product') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.loading.col.ordered') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.loading.col.loaded') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">{{ t('planning.loading.col.state') }}</th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.loading.col.actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in order.lines" :key="keyOf(line)" class="border-t border-border">
            <td class="px-3 py-2 tabular-nums">{{ line.lineNo }}</td>
            <td class="px-3 py-2">
              <p class="text-card-foreground">{{ line.recipientName || '-' }}</p>
              <p class="text-xs text-muted-foreground">{{ line.deliveryPointName }}</p>
            </td>
            <td class="px-3 py-2">{{ line.productName || line.productNo }}</td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              {{ formatNumber(line.quantity) }} {{ line.unit }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              {{ formatNumber(line.loadedQuantity) }}
              <template v-if="line.loadedQuantity !== null">{{ line.unit }}</template>
            </td>
            <td class="px-3 py-2">
              <StatusPill
                :label="t(`planning.loading.state.${stateOf(line)}`)"
                :tone="STATE_TONES[stateOf(line)]"
              />
            </td>
            <td class="px-3 py-2">
              <p
                v-if="line.checkedByDriver && stateOf(line) !== 'to_declare'"
                class="text-right text-xs text-muted-foreground"
              >
                {{ t('planning.loading.byDriver') }}
              </p>
              <div
                v-else-if="canExecute && stateOf(line) !== 'to_declare'"
                class="flex flex-wrap justify-end gap-1"
              >
                <button
                  v-if="stateOf(line) === 'to_check'"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="store.conform(line)"
                >
                  <CircleCheck class="w-4 h-4 text-primary" />
                  {{ t('planning.loading.conform') }}
                </button>
                <button
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="rejecting = line"
                >
                  <CircleX class="w-4 h-4 text-destructive" />
                  {{ t('planning.loading.nonconform') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="bg-card border border-border rounded overflow-x-auto">
      <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
        {{ t('planning.loading.returnsTitle') }}
      </h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold text-left">{{ t('planning.loading.col.order') }}</th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.loading.col.recipient') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.loading.col.product') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.loading.col.returned') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.loading.col.handedBack') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.loading.col.actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!store.returns.length">
            <td colspan="6" class="px-3 py-4 text-muted-foreground">
              {{ t('planning.loading.returnsEmpty') }}
            </td>
          </tr>
          <tr v-for="line in store.returns" :key="keyOf(line)" class="border-t border-border">
            <td class="px-3 py-2 whitespace-nowrap">
              <RouterLink :to="orderCard(line.orderNo)" class="text-primary hover:underline">
                {{ line.orderNo }}
              </RouterLink>
              <span class="text-xs text-muted-foreground">
                · {{ t('planning.loading.lineNo', { no: line.lineNo }) }}
              </span>
            </td>
            <td class="px-3 py-2">
              <p class="text-card-foreground">{{ line.recipientName || '-' }}</p>
              <p class="text-xs text-muted-foreground">{{ line.deliveryPointName }}</p>
            </td>
            <td class="px-3 py-2">{{ line.productName || line.productNo }}</td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              {{ formatNumber(line.quantity) }} {{ line.unit }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <StatusPill
                v-if="!line.handedBackAt"
                :label="t('planning.loading.returns.notHandedBack')"
                tone="warning"
              />
              <span v-else class="text-muted-foreground">
                {{ formatDateTime(line.handedBackAt) }}
              </span>
            </td>
            <td class="px-3 py-2">
              <div v-if="canReceiveReturns" class="flex flex-wrap justify-end gap-1">
                <button
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="receiving = line"
                >
                  <CircleCheck class="w-4 h-4 text-primary" />
                  {{ t('planning.loading.returns.receive') }}
                </button>
                <button
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="refusingReturn = line"
                >
                  <CircleX class="w-4 h-4 text-destructive" />
                  {{ t('planning.loading.returns.nonconform') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>

  <PlanningReasonDialog
    :open="rejecting !== null"
    :title="t('planning.loading.nonconform')"
    kind="nonconformity"
    :loading="store.acting"
    destructive
    @confirm="onReject"
    @cancel="rejecting = null"
  />
  <ConfirmDialog
    :open="receiving !== null"
    :title="t('planning.loading.returns.receive')"
    :message="
      receiving
        ? t('planning.loading.returns.receiveMessage', {
            no: receiving.orderNo,
            product: receiving.productName || receiving.productNo
          })
        : ''
    "
    :loading="store.acting"
    @confirm="onReceive"
    @cancel="receiving = null"
  />
  <PlanningReasonDialog
    :open="refusingReturn !== null"
    :title="t('planning.loading.returns.nonconform')"
    kind="nonconformity"
    :loading="store.acting"
    destructive
    @confirm="onRefuseReturn"
    @cancel="refusingReturn = null"
  />
  <PickupConfirmDialog
    :note="confirming"
    :loading="confirmBusy"
    :error="confirmError"
    @confirm="onConfirmPickup"
    @cancel="confirming = null"
  />
</template>
