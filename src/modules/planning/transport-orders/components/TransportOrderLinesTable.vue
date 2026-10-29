<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarPlus, GripVertical, PackageCheck, Search, Undo2 } from '@lucide/vue'
import { remainderQuantity } from '@/modules/planning/reception/domain/reception'
import { formatNumber } from '@/utils/format'
import {
  canDeclareLine,
  canHandBackLine,
  orderLineState,
  type TransportOrderStatus
} from '../domain/transportOrder'
import type { TransportOrderLineApi } from '../types/transportOrder.types'

const props = defineProps<{
  lines: TransportOrderLineApi[]
  status: TransportOrderStatus
  totalWeightKg: number | null
  canAct?: boolean
  /** Replanning a remainder is the planner's (TRS01-US17). */
  canReplan?: boolean
  /** On a fleet order the driver declares from his space; the card only shows the result. */
  driverDeclares?: boolean
  busy?: boolean
  /** The execution order can be changed by moving the lines. */
  reorderable?: boolean
}>()
const emit = defineEmits<{
  reorder: [lineNos: number[]]
  declare: [line: TransportOrderLineApi]
  handBack: [line: TransportOrderLineApi]
  remainder: [line: TransportOrderLineApi]
}>()

const { t } = useI18n()

const actionsShown = computed(() =>
  props.lines.some(
    (line) =>
      (props.canAct &&
        ((!props.driverDeclares && canDeclareLine(props.status, line)) || canHandBackLine(line))) ||
      (props.canReplan && remainderQuantity(line) !== null)
  )
)

/* The execution order is the order of the rows; it is changed by dragging a row (or with the
 * arrow keys on its handle). The line number stays the line's identifier. */
const rows = ref<TransportOrderLineApi[]>([...props.lines])
watch(
  () => props.lines,
  (lines) => (rows.value = [...lines])
)
const dragged = ref<number | null>(null)
const over = ref<number | null>(null)

function onDragStart(lineNo: number, event: DragEvent) {
  dragged.value = lineNo
  event.dataTransfer?.setData('text/plain', String(lineNo))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function onDragOver(lineNo: number) {
  if (dragged.value === null || dragged.value === lineNo) return
  over.value = lineNo
  const from = rows.value.findIndex((line) => line.lineNo === dragged.value)
  const to = rows.value.findIndex((line) => line.lineNo === lineNo)
  if (from < 0 || to < 0) return
  const next = [...rows.value]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  rows.value = next
}
function commit() {
  const before = props.lines.map((line) => line.lineNo).join(',')
  const after = rows.value.map((line) => line.lineNo)
  dragged.value = null
  over.value = null
  if (after.join(',') !== before) emit('reorder', after)
}
function finishDrag() {
  if (dragged.value === null) return
  commit()
}
function moveBy(lineNo: number, step: -1 | 1) {
  const from = rows.value.findIndex((line) => line.lineNo === lineNo)
  const to = from + step
  if (from < 0 || to < 0 || to >= rows.value.length) return
  const next = [...rows.value]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  rows.value = next
  commit()
}

/* A sub-list is filtered like a main list. */
const query = ref('')
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((line) =>
    [line.deliveryRequestNo, line.deliveryPointName, line.recipientName, line.productName]
      .join(' ')
      .toLowerCase()
      .includes(q)
  )
})
const canDrag = computed(() => !!props.reorderable && !props.busy && !query.value.trim())

const actionClass =
  'cursor-pointer inline-flex items-center justify-center p-1.5 rounded text-primary hover:bg-accent transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <div v-if="lines.length > 1" class="flex items-center justify-between gap-3 mb-2">
    <label class="relative w-full max-w-xs">
      <Search
        class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
      />
      <input
        v-model="query"
        type="search"
        class="w-full h-8 pl-8 pr-2 text-sm border border-border rounded bg-background outline-none focus:border-primary"
        :placeholder="t('planning.transportOrders.lines.filter')"
      />
    </label>
    <p v-if="reorderable" class="text-xs text-muted-foreground">
      {{ t('planning.transportOrders.lines.reorderHint') }}
    </p>
  </div>
  <div class="border border-border rounded overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-muted/40 text-xs text-muted-foreground">
          <th v-if="reorderable" class="px-1 py-2 w-6" />
          <th class="px-3 py-2 font-semibold text-right w-14 whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.sequence') }}
          </th>
          <th class="px-3 py-2 font-semibold text-right w-14 whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.lineNo') }}
          </th>
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.request') }}
          </th>
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.point') }}
          </th>
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.product') }}
          </th>
          <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.quantity') }}
          </th>
          <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.received') }}
          </th>
          <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.weight') }}
          </th>
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.state') }}
          </th>
          <th v-if="actionsShown" class="px-3 py-2 font-semibold text-right whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.actions') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!shown.length">
          <td colspan="11" class="px-3 py-4 text-muted-foreground">
            {{ t('planning.transportOrders.lines.empty') }}
          </td>
        </tr>
        <tr
          v-for="line in shown"
          :key="line.lineNo"
          class="border-t border-border align-top transition-colors"
          :class="
            dragged === line.lineNo ? 'bg-primary/10' : over === line.lineNo ? 'bg-accent' : ''
          "
          :draggable="canDrag"
          @dragstart="(event) => canDrag && onDragStart(line.lineNo, event)"
          @dragover.prevent="canDrag && onDragOver(line.lineNo)"
          @drop.prevent="finishDrag"
          @dragend="finishDrag"
        >
          <td v-if="reorderable" class="px-1 py-2 text-muted-foreground">
            <button
              type="button"
              class="p-0.5 rounded hover:bg-accent disabled:opacity-40"
              :class="canDrag ? 'cursor-grab' : 'cursor-not-allowed'"
              :disabled="!canDrag"
              :title="t('planning.transportOrders.lines.reorderHint')"
              :aria-label="t('planning.transportOrders.lines.moveLine', { no: line.lineNo })"
              @keydown.up.prevent="moveBy(line.lineNo, -1)"
              @keydown.down.prevent="moveBy(line.lineNo, 1)"
            >
              <GripVertical class="w-4 h-4" />
            </button>
          </td>
          <td class="px-3 py-2 text-right tabular-nums font-semibold text-card-foreground">
            {{ rows.indexOf(line) + 1 }}
          </td>
          <td class="px-3 py-2 text-right tabular-nums text-muted-foreground">
            {{ line.lineNo }}
          </td>
          <td class="px-3 py-2 whitespace-nowrap">
            <RouterLink
              v-if="line.deliveryRequestNo"
              :to="{
                path: '/planning/delivery-requests',
                query: { no: line.deliveryRequestNo, cardMode: 'view' }
              }"
              class="text-primary hover:underline"
            >
              {{ line.deliveryRequestNo }}
            </RouterLink>
            <span v-else class="text-muted-foreground">
              {{ t('planning.transportOrders.lines.manual') }}
            </span>
            <!-- The order's reference follows the delivery to the vehicle (TRS01-US06). -->
            <span v-if="line.externalReference" class="block text-xs text-muted-foreground">
              {{ line.externalReference }}
            </span>
          </td>
          <td class="px-3 py-2 min-w-48">
            <p class="font-medium text-card-foreground">{{ line.deliveryPointName }}</p>
            <p v-if="line.recipientName" class="text-xs text-muted-foreground">
              {{ line.recipientName }}
            </p>
          </td>
          <td class="px-3 py-2 min-w-32">{{ line.productName }}</td>
          <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
            {{ formatNumber(line.loadedQuantity ?? line.quantity, 1) }}
            <span class="text-muted-foreground">{{ line.unit }}</span>
          </td>
          <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
            <template v-if="line.receivedQuantity !== null">
              {{ formatNumber(line.receivedQuantity, 1) }}
              <span
                v-if="line.quantityGap"
                class="block text-xs"
                :class="line.quantityGap < 0 ? 'text-destructive' : 'text-success'"
              >
                {{ line.quantityGap > 0 ? '+' : '' }}{{ formatNumber(line.quantityGap, 1) }}
              </span>
            </template>
            <span v-else class="text-muted-foreground">·</span>
          </td>
          <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
            {{ line.weightKg === null ? '' : formatNumber(line.weightKg, 1) }}
            <span v-if="line.volumeM3" class="block text-xs text-muted-foreground">
              {{ formatNumber(line.volumeM3, 1) }} m³
            </span>
          </td>
          <td class="px-3 py-2">
            <TransportOrderLineStatePill :state="orderLineState(line)" />
          </td>
          <td v-if="actionsShown" class="px-3 py-1.5 text-right whitespace-nowrap">
            <button
              v-if="canAct && !driverDeclares && canDeclareLine(status, line)"
              type="button"
              :class="actionClass"
              :disabled="busy"
              :title="t('planning.transportOrders.action.declare')"
              :aria-label="t('planning.transportOrders.action.declare')"
              @click="emit('declare', line)"
            >
              <PackageCheck class="w-4 h-4" />
            </button>
            <button
              v-if="canAct && canHandBackLine(line)"
              type="button"
              :class="actionClass"
              :disabled="busy"
              :title="t('planning.transportOrders.action.handBack')"
              :aria-label="t('planning.transportOrders.action.handBack')"
              @click="emit('handBack', line)"
            >
              <Undo2 class="w-4 h-4" />
            </button>
            <button
              v-if="canReplan && remainderQuantity(line) !== null"
              type="button"
              :class="actionClass"
              :disabled="busy"
              :title="t('planning.transportOrders.action.remainder')"
              :aria-label="t('planning.transportOrders.action.remainder')"
              @click="emit('remainder', line)"
            >
              <CalendarPlus class="w-4 h-4" />
            </button>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="lines.length && totalWeightKg !== null">
        <tr class="border-t border-border bg-muted/40 font-medium">
          <td
            :colspan="reorderable ? 8 : 7"
            class="px-3 py-2 text-right text-xs text-muted-foreground"
          >
            {{ t('planning.transportOrders.lines.total') }}
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatNumber(totalWeightKg, 1) }}</td>
          <td :colspan="actionsShown ? 2 : 1" />
        </tr>
      </tfoot>
    </table>
  </div>
</template>
