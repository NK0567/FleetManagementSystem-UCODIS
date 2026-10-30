<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  CloudOff,
  MapPin,
  PackageCheck,
  RotateCcw,
  Undo2,
  Wifi
} from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { formatDateTime, formatNumber } from '@/utils/format'
import { quantityGap } from '@/modules/planning/quantity-tolerances/domain/quantityTolerance'
import { mySpaceApi } from '../api/mySpaceApi'
import type { MyOrderApi, MyOrderLineApi, MyReturnApi } from '../types/mySpace.types'

/**
 * What the driver does himself on his transport order (TRS03-US05 to US14): he checks his load
 * compartment by compartment, marks his arrival at each point, declares what is delivered, and
 * records a postponement or the recipient's refusal. He never enters the recipient's name.
 */
const { t } = useI18n()
/** Only the driver records; his assistant follows the same order without the buttons. */
const { canExecute } = usePermissions('MYSPACE')
const orders = ref<MyOrderApi[]>([])
const loading = ref(true)
const acting = ref(false)
const error = ref<string | null>(null)

async function load() {
  void loadReturns()
  try {
    orders.value = (await mySpaceApi.orders()).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.orders.loadError'))
  } finally {
    loading.value = false
  }
}

/* ---- Without network (TRS03-US18): what the driver records is kept on the device and sent by
 * itself as soon as the connection is back, without doing it again. The demonstration has a
 * switch to cut the network; the real device would follow its own connection. */
type Operation =
  | {
      op: 'line'
      orderNo: string
      lineNo: number
      action: Parameters<typeof mySpaceApi.lineAction>[2]
      body: Record<string, unknown>
    }
  | { op: 'point'; orderNo: string; pointNo: string; lines: Record<string, unknown>[] }
  | {
      op: 'pointAction'
      orderNo: string
      pointNo: string
      action: Parameters<typeof mySpaceApi.pointAction>[2]
      body: Record<string, unknown>
    }
  | { op: 'check'; orderNo: string; body: Record<string, unknown> }
const QUEUE_KEY = 'selfService.pendingOperations'
const readQueue = (): Operation[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as Operation[]
  } catch {
    return []
  }
}
const queue = ref<Operation[]>(readQueue())
const offline = ref(false)
function keepQueue() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.value))
  } catch {
    /* kept in memory only */
  }
}
function send(operation: Operation): Promise<unknown> {
  if (operation.op === 'line') {
    return mySpaceApi.lineAction(
      operation.orderNo,
      operation.lineNo,
      operation.action,
      operation.body
    )
  }
  if (operation.op === 'point') {
    return mySpaceApi.declarePoint(operation.orderNo, operation.pointNo, operation.lines)
  }
  if (operation.op === 'pointAction') {
    return mySpaceApi.pointAction(
      operation.orderNo,
      operation.pointNo,
      operation.action,
      operation.body
    )
  }
  return mySpaceApi.check(operation.orderNo, operation.body)
}
async function synchronize() {
  while (queue.value.length && !offline.value) {
    const [first] = queue.value
    try {
      await send(first!)
    } catch (cause) {
      error.value = apiErrorMessage(cause, t('selfService.orders.saveError'))
    }
    queue.value = queue.value.slice(1)
    keepQueue()
  }
  await load()
}
function toggleNetwork() {
  offline.value = !offline.value
  if (!offline.value) void synchronize()
}

async function run(operation: Operation): Promise<boolean> {
  if (offline.value) {
    queue.value = [...queue.value, operation]
    keepQueue()
    return true
  }
  acting.value = true
  error.value = null
  try {
    await send(operation)
    await load()
    return true
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.orders.saveError'))
    return false
  } finally {
    acting.value = false
  }
}

/* ---- What is still to bring back to the warehouse, even from a completed order (TRS03-US11). */
const returns = ref<MyReturnApi[]>([])
async function loadReturns() {
  try {
    returns.value = (await mySpaceApi.returns()).data.data
  } catch {
    returns.value = []
  }
}
async function handBack(item: MyReturnApi) {
  if (
    await run({
      op: 'line',
      orderNo: item.orderNo,
      lineNo: item.lineNo,
      action: 'hand-back',
      body: {}
    })
  ) {
    await loadReturns()
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
  void run({
    op: 'check',
    orderNo: order.no,
    body: { lineNos: toCheck(group).map((line) => line.lineNo), verdict: 'conform' }
  })
}
/* A shortcut validates every compartment at once when all is conforming (TRS03-US02). */
function conformAll(order: MyOrderApi) {
  const lineNos = groupsOf(order).flatMap((group) => toCheck(group).map((line) => line.lineNo))
  if (lineNos.length)
    void run({ op: 'check', orderNo: order.no, body: { lineNos, verdict: 'conform' } })
}
async function confirmNonconform() {
  const pending = rejecting.value
  if (!pending || !reasonNo.value) return
  const done = await run({
    op: 'check',
    orderNo: pending.order.no,
    body: {
      lineNos: toCheck(pending.group).map((line) => line.lineNo),
      verdict: 'nonconform',
      reasonNo: reasonNo.value,
      comment: comment.value
    }
  })
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
/** The point to handle now: the first one that is not settled yet. */
function currentPointNo(order: MyOrderApi): string | null {
  if (order.status !== 'ready' && order.status !== 'in_progress') return null
  return pointsOf(order).find((point) => !point.lines.every(settled))?.no ?? null
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
const canRetry = (order: MyOrderApi, point: Point) =>
  order.status === 'in_progress' &&
  point.lines.some((line) => retry(line) && !notLoaded(line) && !line.declaredAt && !line.refusalAt)

/* ---- Corrections of an entry made by mistake, with the reason: the non-conformity while the
 * order is being loaded, the declaration while the recipient has not answered, the refusal while
 * no later point is started. */
type Correction =
  | { kind: 'nonconformity' | 'refusal'; order: MyOrderApi; line: MyOrderLineApi }
  | { kind: 'declaration'; order: MyOrderApi; point: Point }
const correcting = ref<Correction | null>(null)
const correctionComment = ref('')
const canCancelNonconformity = (order: MyOrderApi, line: MyOrderLineApi) =>
  order.status === 'confirmed' && !!line.nonconformityAt
function canCancelDeclaration(order: MyOrderApi, point: Point): boolean {
  const declared = point.lines.filter((line) => !!line.declaredAt)
  return (
    order.status === 'in_progress' &&
    declared.length > 0 &&
    declared.every(
      (line) =>
        !line.receptionConfirmedAt &&
        !line.receptionContestedAt &&
        !line.goodsBackAt &&
        !line.remainderAt
    )
  )
}
function canCancelRefusal(order: MyOrderApi, point: Point, line: MyOrderLineApi): boolean {
  if (order.status !== 'in_progress' || !line.refusalAt || !line.arrivedAt) return false
  if (line.refusalByRecipient || line.goodsBackAt) return false
  const points = pointsOf(order)
  return points
    .slice(points.findIndex((item) => item.no === point.no) + 1)
    .every((item) => item.lines.every((other) => !other.arrivedAt))
}
function openCorrection(correction: Correction) {
  correcting.value = correction
  correctionComment.value = ''
}
async function confirmCorrection() {
  const item = correcting.value
  const comment = correctionComment.value.trim()
  if (!item || !comment) return
  const done = await run(
    item.kind === 'declaration'
      ? {
          op: 'pointAction',
          orderNo: item.order.no,
          pointNo: item.point.no,
          action: 'cancel-declaration',
          body: { comment }
        }
      : {
          op: 'line',
          orderNo: item.order.no,
          lineNo: item.line.lineNo,
          action: item.kind === 'refusal' ? 'cancel-refusal' : 'cancel-nonconformity',
          body: { comment }
        }
  )
  if (done) correcting.value = null
}

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
const availableFrom = ref('')

function open(kind: Pending['kind'], order: MyOrderApi, line: MyOrderLineApi) {
  pending.value = { kind, order, line }
  quantity.value = line.loadedQuantity ?? line.quantity
  reasonNo.value = ''
  comment.value = ''
  withReturn.value = false
  availableFrom.value = ''
}

/* ---- The delivery of a point, line by line (TRS03-US11), with the fuel measures (TRS03-US10). */
interface DeclareRow {
  line: MyOrderLineApi
  delivered: boolean
  receivedQuantity: number | null
  deliveredVolumeL: number | null
  temperatureC: number | null
  density: number | null
  volume15L: number | null
  reasonNo: string
  comment: string
  justification: string
}
const declaring = ref<{ order: MyOrderApi; point: Point; rows: DeclareRow[] } | null>(null)
const openLines = (point: Point) =>
  point.lines.filter(
    (line) =>
      !notLoaded(line) &&
      !line.declaredAt &&
      !line.refusalAt &&
      !(line.postponedAt && line.returnedAt)
  )
function openDeclare(order: MyOrderApi, point: Point) {
  declaring.value = {
    order,
    point,
    rows: openLines(point).map((line) => ({
      line,
      delivered: true,
      receivedQuantity: line.loadedQuantity ?? line.quantity,
      deliveredVolumeL: line.isFuel ? (line.loadedQuantity ?? line.quantity) : null,
      temperatureC: null,
      density: null,
      volume15L: null,
      reasonNo: '',
      comment: '',
      justification: ''
    }))
  }
}
/** The delivered quantity falls outside the tolerance: a justification goes with it (TRS03-US16). */
function outsideTolerance(row: DeclareRow): boolean {
  const reference = row.line.tolerance
  if (!row.delivered || !reference.rule) return false
  const received = row.line.isFuel
    ? num(reference.loaded15L !== null ? row.volume15L : row.deliveredVolumeL)
    : num(row.receivedQuantity)
  if (!Number.isFinite(received)) return false
  return quantityGap(reference.rule, reference.loaded15L ?? reference.loaded, received).outside
}
const justificationRequired = (order: MyOrderApi, row: DeclareRow) =>
  order.overToleranceMode === 'block' && outsideTolerance(row)
const num = (value: unknown) =>
  value === '' || value === null || value === undefined ? NaN : Number(value)
const declareValid = computed(() => {
  const rows = declaring.value?.rows ?? []
  if (!rows.some((row) => row.delivered)) return false
  const order = declaring.value!.order
  if (rows.some((row) => justificationRequired(order, row) && !row.justification.trim())) {
    return false
  }
  return rows.every((row) =>
    !row.delivered
      ? !!row.reasonNo
      : row.line.isFuel
        ? [row.deliveredVolumeL, row.temperatureC, row.density, row.volume15L].every((v) =>
            Number.isFinite(num(v))
          )
        : Number.isFinite(num(row.receivedQuantity)) && num(row.receivedQuantity) >= 0
  )
})
async function confirmDeclare() {
  const item = declaring.value
  if (!item || !declareValid.value) return
  const lines = item.rows.map((row) =>
    !row.delivered
      ? { lineNo: row.line.lineNo, delivered: false, reasonNo: row.reasonNo, comment: row.comment }
      : row.line.isFuel
        ? {
            lineNo: row.line.lineNo,
            delivered: true,
            receivedQuantity: num(row.deliveredVolumeL),
            deliveredVolumeL: num(row.deliveredVolumeL),
            temperatureC: num(row.temperatureC),
            density: num(row.density),
            volume15L: num(row.volume15L),
            justification: outsideTolerance(row) ? row.justification.trim() : ''
          }
        : {
            lineNo: row.line.lineNo,
            delivered: true,
            receivedQuantity: num(row.receivedQuantity),
            justification: outsideTolerance(row) ? row.justification.trim() : ''
          }
  )
  if (await run({ op: 'point', orderNo: item.order.no, pointNo: item.point.no, lines })) {
    declaring.value = null
  }
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
        ? {
            reasonNo: reasonNo.value,
            comment: comment.value,
            withReturn: withReturn.value,
            availableFrom: availableFrom.value || null
          }
        : { reasonNo: reasonNo.value, comment: comment.value }
  const done = await run({
    op: 'line',
    orderNo: item.order.no,
    lineNo: item.line.lineNo,
    action: item.kind,
    body
  })
  if (done) pending.value = null
}
const pendingDisabled = computed(() => {
  const item = pending.value
  if (!item) return true
  if (item.kind === 'declare') return quantity.value === null || quantity.value < 0
  return !reasonNo.value
})

const buttonClass =
  'cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 h-11 sm:h-9 text-sm rounded border border-border hover:bg-accent transition disabled:opacity-60 disabled:cursor-not-allowed'
const primaryClass =
  'cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 h-11 sm:h-9 text-sm rounded bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed'

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div v-if="canExecute" class="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 h-8 rounded border text-xs transition"
        :class="
          offline
            ? 'border-warning text-warning bg-warning/10'
            : 'border-border text-muted-foreground hover:bg-accent'
        "
        @click="toggleNetwork"
      >
        <component :is="offline ? CloudOff : Wifi" class="w-4 h-4" />
        {{ offline ? t('selfService.offline.on') : t('selfService.offline.off') }}
      </button>
      <span v-if="queue.length" class="text-xs text-warning">
        {{ t('selfService.offline.pending', queue.length) }}
      </span>
    </div>
    <FormAlerts :error="error" @clear:error="error = null" />

    <section v-if="returns.length" class="bg-card border border-warning/40 rounded p-3 space-y-2">
      <h3 class="text-sm font-semibold text-card-foreground">
        {{ t('selfService.returns.title') }}
      </h3>
      <div
        v-for="item in returns"
        :key="`${item.orderNo}-${item.lineNo}`"
        class="flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        <span>
          {{ item.productName }} · {{ formatNumber(item.quantity) }} {{ item.unit }}
          <span class="text-muted-foreground">
            · {{ item.deliveryPointName }} · {{ item.orderNo
            }}<template v-if="item.reason"> · {{ item.reason }}</template>
          </span>
        </span>
        <button
          v-if="canExecute"
          type="button"
          :class="buttonClass"
          :disabled="acting"
          @click="handBack(item)"
        >
          <Undo2 class="w-4 h-4 text-primary" /> {{ t('selfService.returns.handBack') }}
        </button>
      </div>
    </section>
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
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-card-foreground">
            {{ t('selfService.orders.checkTitle') }}
          </h3>
          <button
            v-if="
              canExecute &&
              groupsOf(order).filter((group) => toCheck(group).length && !awaitingWarehouse(group))
                .length > 1
            "
            type="button"
            :class="primaryClass"
            :disabled="acting"
            @click="conformAll(order)"
          >
            <CircleCheck class="w-4 h-4" /> {{ t('selfService.orders.conformAll') }}
          </button>
        </div>
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
              <span
                v-if="line.nonconformityAt && line.nonconformityReason"
                class="text-muted-foreground"
              >
                · {{ line.nonconformityReason }}
              </span>
              <button
                v-if="canExecute && canCancelNonconformity(order, line)"
                type="button"
                class="cursor-pointer text-xs text-muted-foreground underline hover:text-primary disabled:opacity-60"
                :disabled="acting"
                @click="openCorrection({ kind: 'nonconformity', order, line })"
              >
                {{ t('selfService.orders.cancelNonconformity') }}
              </button>
            </li>
          </ul>
          <p v-if="awaitingWarehouse(group)" class="text-xs text-muted-foreground">
            {{ t('selfService.orders.awaitingWarehouse') }}
          </p>
          <div
            v-else-if="canExecute && toCheck(group).length"
            class="grid grid-cols-1 sm:flex sm:flex-wrap gap-2"
          >
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
        <li
          v-for="(point, index) in pointsOf(order)"
          :key="point.no"
          class="px-4 py-3 space-y-2"
          :class="point.no === currentPointNo(order) ? 'bg-primary/5' : ''"
        >
          <div class="flex flex-wrap items-start gap-3">
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
              <p v-if="arrived(point)" class="text-xs text-muted-foreground">
                {{
                  t('selfService.orders.arrivedAt', {
                    at: formatDateTime(point.lines.find((line) => line.arrivedAt)!.arrivedAt)
                  })
                }}
              </p>
            </div>
            <button
              v-if="canExecute && canArrive(order, point)"
              type="button"
              class="w-full sm:w-auto"
              :class="primaryClass"
              :disabled="acting"
              @click="
                run({
                  op: 'line',
                  orderNo: order.no,
                  lineNo: point.lines[0]!.lineNo,
                  action: 'arrive',
                  body: {}
                })
              "
            >
              <MapPin class="w-4 h-4" /> {{ t('selfService.orders.arrive') }}
            </button>
            <button
              v-else-if="
                canExecute &&
                order.status === 'in_progress' &&
                arrived(point) &&
                openLines(point).length
              "
              type="button"
              class="w-full sm:w-auto"
              :class="primaryClass"
              :disabled="acting"
              @click="openDeclare(order, point)"
            >
              <PackageCheck class="w-4 h-4" /> {{ t('selfService.orders.declare') }}
            </button>
          </div>
          <ul class="ml-0 sm:ml-10 space-y-2">
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
              <div
                v-if="canExecute && canAct(order, point, line)"
                class="mt-1.5 grid grid-cols-2 sm:flex sm:flex-wrap gap-2"
              >
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
              <button
                v-if="canExecute && canCancelRefusal(order, point, line)"
                type="button"
                class="mt-1 cursor-pointer text-xs text-muted-foreground underline hover:text-primary disabled:opacity-60"
                :disabled="acting"
                @click="openCorrection({ kind: 'refusal', order, line })"
              >
                {{ t('selfService.orders.cancelRefusal') }}
              </button>
            </li>
          </ul>
          <div
            v-if="canExecute && (canRetry(order, point) || canCancelDeclaration(order, point))"
            class="ml-0 sm:ml-10 flex flex-wrap items-center gap-3"
          >
            <button
              v-if="canRetry(order, point)"
              type="button"
              :class="buttonClass"
              :disabled="acting"
              @click="
                run({
                  op: 'pointAction',
                  orderNo: order.no,
                  pointNo: point.no,
                  action: 'retry',
                  body: {}
                })
              "
            >
              <RotateCcw class="w-4 h-4 text-primary" /> {{ t('selfService.orders.retry') }}
            </button>
            <button
              v-if="canCancelDeclaration(order, point)"
              type="button"
              class="cursor-pointer text-xs text-muted-foreground underline hover:text-primary disabled:opacity-60"
              :disabled="acting"
              @click="openCorrection({ kind: 'declaration', order, point })"
            >
              {{ t('selfService.orders.cancelDeclaration') }}
            </button>
          </div>
        </li>
      </ol>
    </section>

    <ConfirmDialog
      :open="!!declaring"
      :title="t('selfService.orders.declare')"
      :confirm-label="t('common.save')"
      :confirm-disabled="!declareValid"
      :loading="acting"
      panel-class="max-w-lg"
      @confirm="confirmDeclare"
      @cancel="declaring = null"
    >
      <div v-if="declaring" class="space-y-3">
        <p class="text-sm text-muted-foreground">
          {{ declaring.point.recipientName || declaring.point.name }} ·
          {{ t('selfService.orders.declareHint') }}
        </p>
        <div
          v-for="row in declaring.rows"
          :key="row.line.lineNo"
          class="rounded border border-border p-2 space-y-2"
        >
          <label class="flex items-center gap-2 text-sm font-medium">
            <input v-model="row.delivered" type="checkbox" class="h-4 w-4 accent-primary" />
            {{ row.line.productName }} ·
            {{ formatNumber(row.line.loadedQuantity ?? row.line.quantity) }} {{ row.line.unit }}
          </label>
          <template v-if="row.delivered">
            <BaseFormField
              v-if="!row.line.isFuel"
              :label="t('selfService.orders.receivedQuantity')"
              required
            >
              <FormInput v-model="row.receivedQuantity" type="number" :min="0" />
            </BaseFormField>
            <div v-else class="grid grid-cols-2 gap-2">
              <BaseFormField :label="t('selfService.orders.deliveredVolume')" required>
                <FormInput v-model="row.deliveredVolumeL" type="number" :min="0" />
              </BaseFormField>
              <BaseFormField :label="t('planning.pickup.temperature')" required>
                <FormInput v-model="row.temperatureC" type="number" />
              </BaseFormField>
              <BaseFormField :label="t('planning.pickup.density')" required>
                <FormInput v-model="row.density" type="number" />
              </BaseFormField>
              <BaseFormField :label="t('planning.pickup.volume15')" required>
                <FormInput v-model="row.volume15L" type="number" :min="0" />
              </BaseFormField>
            </div>
            <BaseFormField
              v-if="outsideTolerance(row)"
              :label="t('selfService.orders.justification')"
              :required="justificationRequired(declaring.order, row)"
            >
              <FormInput v-model="row.justification" :maxlength="200" />
            </BaseFormField>
          </template>
          <template v-else>
            <BaseFormField :label="t('selfService.orders.undeliveredReason')" required>
              <select
                v-model="row.reasonNo"
                class="w-full h-9 px-2 text-sm border border-border rounded bg-background"
              >
                <option value="" disabled>{{ t('selfService.orders.pickReason') }}</option>
                <option
                  v-for="reason in declaring.order.reasons.refusal"
                  :key="reason.no"
                  :value="reason.no"
                >
                  {{ reason.name }}
                </option>
              </select>
            </BaseFormField>
            <BaseFormField :label="t('selfService.orders.comment')">
              <FormInput v-model="row.comment" :maxlength="200" />
            </BaseFormField>
          </template>
        </div>
        <p v-if="!declaring.rows.some((row) => row.delivered)" class="text-xs text-destructive">
          {{ t('selfService.orders.nothingDelivered') }}
        </p>
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      :open="!!correcting"
      :title="correcting ? t(`selfService.orders.correction.${correcting.kind}`) : ''"
      :confirm-label="t('common.save')"
      :confirm-disabled="!correctionComment.trim()"
      :loading="acting"
      @confirm="confirmCorrection"
      @cancel="correcting = null"
    >
      <BaseFormField v-if="correcting" :label="t('selfService.orders.correction.reason')" required>
        <FormInput v-model="correctionComment" :maxlength="200" />
      </BaseFormField>
    </ConfirmDialog>

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
          <BaseFormField
            v-if="pending.kind === 'postpone'"
            :label="t('selfService.orders.availableFrom')"
          >
            <DateFormInput v-model="availableFrom" />
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
