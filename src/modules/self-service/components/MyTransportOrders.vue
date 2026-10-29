<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarClock, CircleCheck, CircleX, MapPin, PackageCheck, Undo2 } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { formatDateTime, formatNumber } from '@/utils/format'
import { mySpaceApi } from '../api/mySpaceApi'
import type { MyOrderApi, MyOrderLineApi } from '../types/mySpace.types'

/**
 * What the driver does himself on his transport order (TRS03-US05 to US14): he checks his load
 * compartment by compartment, marks his arrival at each point, declares what is delivered, and
 * records a postponement or the recipient's refusal. He never enters the recipient's name.
 */
const { t } = useI18n()
const orders = ref<MyOrderApi[]>([])
const loading = ref(true)
const acting = ref(false)
const error = ref<string | null>(null)

async function load() {
  try {
    orders.value = (await mySpaceApi.orders()).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.orders.loadError'))
  } finally {
    loading.value = false
  }
}

async function run(call: () => Promise<unknown>): Promise<boolean> {
  acting.value = true
  error.value = null
  try {
    await call()
    await load()
    return true
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.orders.saveError'))
    return false
  } finally {
    acting.value = false
  }
}

/* ---- Loading check: one verdict per compartment; a vehicle without separation has one. */
interface CheckGroup {
  key: string
  label: string
  lines: MyOrderLineApi[]
}
function groupsOf(order: MyOrderApi): CheckGroup[] {
  const byNo = new Map(order.lines.map((line) => [line.lineNo, line]))
  const uses = order.compartmentPlan?.uses.filter((use) => use.lines.length) ?? []
  if (!uses.length)
    return [{ key: 'all', label: t('selfService.orders.wholeLoad'), lines: order.lines }]
  return uses.map((use) => ({
    key: String(use.no),
    label: t('fleet.vehicles.compartment', { no: use.no }),
    lines: [...new Set(use.lines.map((item) => item.lineNo))]
      .map((no) => byNo.get(no))
      .filter((line): line is MyOrderLineApi => !!line)
  }))
}
const toCheck = (group: CheckGroup) =>
  group.lines.filter((line) => !line.conformingAt && !line.nonconformityAt)
const awaitingWarehouse = (group: CheckGroup) =>
  toCheck(group).some((line) => line.loadedQuantity === null)

const rejecting = ref<{ order: MyOrderApi; group: CheckGroup } | null>(null)
const reasonNo = ref('')
const comment = ref('')

function conform(order: MyOrderApi, group: CheckGroup) {
  void run(() =>
    mySpaceApi.check(order.no, {
      lineNos: toCheck(group).map((line) => line.lineNo),
      verdict: 'conform'
    })
  )
}
async function confirmNonconform() {
  const pending = rejecting.value
  if (!pending || !reasonNo.value) return
  const done = await run(() =>
    mySpaceApi.check(pending.order.no, {
      lineNos: toCheck(pending.group).map((line) => line.lineNo),
      verdict: 'nonconform',
      reasonNo: reasonNo.value,
      comment: comment.value
    })
  )
  if (done) rejecting.value = null
}

/* ---- Delivery points, in the execution order of the lines. */
interface Point {
  no: string
  name: string
  recipientName: string
  address: string
  lines: MyOrderLineApi[]
}
function pointsOf(order: MyOrderApi): Point[] {
  const points: Point[] = []
  for (const line of order.lines) {
    let point = points.find((item) => item.no === line.deliveryPointNo)
    if (!point) {
      point = {
        no: line.deliveryPointNo,
        name: line.deliveryPointName,
        recipientName: line.recipientName,
        address: line.address,
        lines: []
      }
      points.push(point)
    }
    point.lines.push(line)
  }
  return points
}
const notLoaded = (line: MyOrderLineApi) => !!line.nonconformityAt
const settled = (line: MyOrderLineApi) =>
  notLoaded(line) || !!line.declaredAt || !!line.refusalAt || !!line.postponedAt
const arrived = (point: Point) => point.lines.some((line) => !!line.arrivedAt)
/** A point opens once the previous one is settled (TRS03-US09). */
function canArrive(order: MyOrderApi, point: Point): boolean {
  if (order.status !== 'ready' && order.status !== 'in_progress') return false
  if (arrived(point) || point.lines.every(notLoaded)) return false
  const points = pointsOf(order)
  const index = points.findIndex((item) => item.no === point.no)
  return index === 0 || points[index - 1]!.lines.every(settled)
}
/* A point simply postponed can be retried at any time while the order runs (TRS03-US12); a
 * line postponed at the recipient's request leaves the order and goes back (TRS03-US13). */
const canAct = (order: MyOrderApi, point: Point, line: MyOrderLineApi) =>
  order.status === 'in_progress' &&
  arrived(point) &&
  !notLoaded(line) &&
  !line.declaredAt &&
  !line.refusalAt &&
  !(line.postponedAt && line.returnedAt)
const retry = (line: MyOrderLineApi) => !!line.postponedAt && !line.returnedAt

function lineState(line: MyOrderLineApi): { label: string; tone: string } {
  if (notLoaded(line))
    return { label: t('selfService.orders.state.notLoaded'), tone: 'text-destructive' }
  if (line.refusalAt)
    return { label: t('selfService.orders.state.refused'), tone: 'text-destructive' }
  if (line.postponedAt)
    return {
      label: line.returnedAt
        ? t('selfService.orders.state.toReturn')
        : t('selfService.orders.state.postponed'),
      tone: 'text-warning'
    }
  if (line.declaredAt) {
    // The driver sees whether the recipient confirmed what he declared (TRS03-US10).
    if (line.receptionContestedAt)
      return { label: t('selfService.orders.state.contested'), tone: 'text-destructive' }
    if (line.receptionConfirmedAt)
      return { label: t('selfService.orders.state.confirmed'), tone: 'text-success' }
    return { label: t('selfService.orders.state.awaitingRecipient'), tone: 'text-muted-foreground' }
  }
  return { label: t('selfService.orders.state.toDeliver'), tone: 'text-muted-foreground' }
}

type Pending =
  | { kind: 'declare'; order: MyOrderApi; line: MyOrderLineApi }
  | { kind: 'postpone' | 'refuse'; order: MyOrderApi; line: MyOrderLineApi }
const pending = ref<Pending | null>(null)
const quantity = ref<number | null>(null)
const withReturn = ref(false)

function open(kind: Pending['kind'], order: MyOrderApi, line: MyOrderLineApi) {
  pending.value = { kind, order, line }
  quantity.value = line.loadedQuantity ?? line.quantity
  reasonNo.value = ''
  comment.value = ''
  withReturn.value = false
}
const reasonsOf = (order: MyOrderApi, kind: 'postpone' | 'refuse') =>
  kind === 'postpone' ? order.reasons.postponement : order.reasons.refusal

async function confirmPending() {
  const item = pending.value
  if (!item) return
  const body =
    item.kind === 'declare'
      ? { receivedQuantity: quantity.value }
      : item.kind === 'postpone'
        ? { reasonNo: reasonNo.value, comment: comment.value, withReturn: withReturn.value }
        : { reasonNo: reasonNo.value, comment: comment.value }
  const done = await run(() =>
    mySpaceApi.lineAction(item.order.no, item.line.lineNo, item.kind, body)
  )
  if (done) pending.value = null
}
const pendingDisabled = computed(() => {
  const item = pending.value
  if (!item) return true
  if (item.kind === 'declare') return quantity.value === null || quantity.value < 0
  return !reasonNo.value
})

const buttonClass =
  'cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm rounded border border-border hover:bg-accent transition disabled:opacity-60 disabled:cursor-not-allowed'
const primaryClass =
  'cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm rounded bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed'

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <FormAlerts :error="error" @clear:error="error = null" />
    <LoadingSpinner v-if="loading" :text="t('common.loading')" />
    <p
      v-else-if="!orders.length"
      class="bg-card border border-border rounded p-4 text-sm text-muted-foreground"
    >
      {{ t('selfService.orders.empty') }}
    </p>

    <section v-for="order in orders" :key="order.no" class="bg-card border border-border rounded">
      <header
        class="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2"
      >
        <div class="min-w-0">
          <p class="font-semibold text-card-foreground">{{ order.no }}</p>
          <p class="text-xs text-muted-foreground">
            {{ order.routeName }} · {{ formatDateTime(order.plannedDeparture) }} ·
            {{ order.vehiclePlate }}
            <template v-if="order.trailerPlate"> + {{ order.trailerPlate }}</template>
          </p>
        </div>
        <TransportOrderStatusPill :status="order.status" />
      </header>

      <!-- Loading check, before leaving -->
      <div v-if="order.status === 'confirmed'" class="px-4 py-3 border-b border-border space-y-2">
        <h3 class="text-sm font-semibold text-card-foreground">
          {{ t('selfService.orders.checkTitle') }}
        </h3>
        <div
          v-for="group in groupsOf(order)"
          :key="group.key"
          class="rounded border border-border p-3 space-y-2"
        >
          <p class="text-sm font-medium text-card-foreground">{{ group.label }}</p>
          <ul class="text-sm space-y-0.5">
            <li v-for="line in group.lines" :key="line.lineNo" class="flex flex-wrap gap-x-2">
              <span>{{ line.productName }}</span>
              <span class="tabular-nums">
                {{ line.loadedQuantity === null ? '…' : formatNumber(line.loadedQuantity) }}
                {{ line.unit }}
              </span>
              <span class="text-muted-foreground"
                >· {{ line.recipientName || line.deliveryPointName }}</span
              >
              <span v-if="line.conformingAt" class="text-success"
                >· {{ t('selfService.orders.checked') }}</span
              >
              <span v-if="line.nonconformityAt" class="text-destructive">
                · {{ t('selfService.orders.state.notLoaded') }}
              </span>
            </li>
          </ul>
          <p v-if="awaitingWarehouse(group)" class="text-xs text-muted-foreground">
            {{ t('selfService.orders.awaitingWarehouse') }}
          </p>
          <div v-else-if="toCheck(group).length" class="flex flex-wrap gap-2">
            <button
              type="button"
              :class="primaryClass"
              :disabled="acting"
              @click="conform(order, group)"
            >
              <CircleCheck class="w-4 h-4" /> {{ t('selfService.orders.conform') }}
            </button>
            <button
              type="button"
              :class="buttonClass"
              :disabled="acting"
              @click="((rejecting = { order, group }), (reasonNo = ''), (comment = ''))"
            >
              <CircleX class="w-4 h-4 text-destructive" /> {{ t('selfService.orders.nonconform') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delivery points, in their order -->
      <ol class="divide-y divide-border">
        <li v-for="(point, index) in pointsOf(order)" :key="point.no" class="px-4 py-3 space-y-2">
          <div class="flex items-start gap-3">
            <span
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              :class="
                point.lines.every(settled)
                  ? 'bg-success-bg text-success'
                  : 'bg-primary/10 text-primary'
              "
            >
              {{ index + 1 }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-card-foreground">
                {{ point.recipientName || point.name }}
              </p>
              <p class="text-xs text-muted-foreground">{{ point.name }} · {{ point.address }}</p>
            </div>
            <button
              v-if="canArrive(order, point)"
              type="button"
              :class="primaryClass"
              :disabled="acting"
              @click="run(() => mySpaceApi.lineAction(order.no, point.lines[0]!.lineNo, 'arrive'))"
            >
              <MapPin class="w-4 h-4" /> {{ t('selfService.orders.arrive') }}
            </button>
            <span v-else-if="arrived(point)" class="text-xs text-muted-foreground shrink-0">
              {{
                t('selfService.orders.arrivedAt', {
                  at: formatDateTime(point.lines.find((line) => line.arrivedAt)!.arrivedAt)
                })
              }}
            </span>
          </div>
          <ul class="ml-10 space-y-2">
            <li v-for="line in point.lines" :key="line.lineNo" class="text-sm">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {{ line.productName }} ·
                  <span class="tabular-nums"
                    >{{ formatNumber(line.loadedQuantity ?? line.quantity) }} {{ line.unit }}</span
                  >
                </span>
                <span class="text-xs" :class="lineState(line).tone">{{
                  lineState(line).label
                }}</span>
              </div>
              <div v-if="canAct(order, point, line)" class="mt-1.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  :class="primaryClass"
                  :disabled="acting"
                  @click="open('declare', order, line)"
                >
                  <PackageCheck class="w-4 h-4" />
                  {{
                    retry(line) ? t('selfService.orders.retry') : t('selfService.orders.declare')
                  }}
                </button>
                <button
                  v-if="!retry(line)"
                  type="button"
                  :class="buttonClass"
                  :disabled="acting"
                  @click="open('postpone', order, line)"
                >
                  <CalendarClock class="w-4 h-4 text-primary" />
                  {{ t('selfService.orders.postpone') }}
                </button>
                <button
                  type="button"
                  :class="buttonClass"
                  :disabled="acting"
                  @click="open('refuse', order, line)"
                >
                  <Undo2 class="w-4 h-4 text-destructive" /> {{ t('selfService.orders.refuse') }}
                </button>
              </div>
            </li>
          </ul>
        </li>
      </ol>
    </section>

    <ConfirmDialog
      :open="!!rejecting"
      :title="t('selfService.orders.nonconform')"
      :confirm-label="t('common.save')"
      :confirm-disabled="!reasonNo"
      :loading="acting"
      @confirm="confirmNonconform"
      @cancel="rejecting = null"
    >
      <div v-if="rejecting" class="space-y-3">
        <BaseFormField :label="t('selfService.orders.reason')" required>
          <select
            v-model="reasonNo"
            class="w-full h-9 px-2 text-sm border border-border rounded bg-background"
          >
            <option value="" disabled>{{ t('selfService.orders.pickReason') }}</option>
            <option
              v-for="reason in rejecting.order.reasons.nonconformity"
              :key="reason.no"
              :value="reason.no"
            >
              {{ reason.name }}
            </option>
          </select>
        </BaseFormField>
        <BaseFormField :label="t('selfService.orders.comment')">
          <FormInput v-model="comment" :maxlength="200" />
        </BaseFormField>
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      :open="!!pending"
      :title="pending ? t(`selfService.orders.${pending.kind}`) : ''"
      :confirm-label="t('common.save')"
      :confirm-disabled="pendingDisabled"
      :loading="acting"
      @confirm="confirmPending"
      @cancel="pending = null"
    >
      <div v-if="pending" class="space-y-3">
        <p class="text-sm text-muted-foreground">
          {{ pending.line.productName }} ·
          {{ pending.line.recipientName || pending.line.deliveryPointName }}
        </p>
        <BaseFormField
          v-if="pending.kind === 'declare'"
          :label="t('selfService.orders.receivedQuantity')"
          required
        >
          <FormInput v-model="quantity" type="number" :min="0" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('selfService.orders.declareHint') }}
          </p>
        </BaseFormField>
        <template v-else>
          <BaseFormField :label="t('selfService.orders.reason')" required>
            <select
              v-model="reasonNo"
              class="w-full h-9 px-2 text-sm border border-border rounded bg-background"
            >
              <option value="" disabled>{{ t('selfService.orders.pickReason') }}</option>
              <option
                v-for="reason in reasonsOf(pending.order, pending.kind)"
                :key="reason.no"
                :value="reason.no"
              >
                {{ reason.name }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('selfService.orders.comment')">
            <FormInput v-model="comment" :maxlength="200" />
          </BaseFormField>
          <label v-if="pending.kind === 'postpone'" class="inline-flex items-start gap-2 text-sm">
            <input v-model="withReturn" type="checkbox" class="h-4 w-4 mt-0.5 accent-primary" />
            {{ t('selfService.orders.withReturn') }}
          </label>
        </template>
      </div>
    </ConfirmDialog>
  </div>
</template>
