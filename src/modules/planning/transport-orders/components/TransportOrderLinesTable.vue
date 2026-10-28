<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarPlus, PackageCheck, Undo2 } from '@lucide/vue'
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
  busy?: boolean
}>()
const emit = defineEmits<{
  declare: [line: TransportOrderLineApi]
  handBack: [line: TransportOrderLineApi]
  remainder: [line: TransportOrderLineApi]
}>()

const { t } = useI18n()

const actionsShown = computed(
  () =>
    props.canAct &&
    props.lines.some(
      (line) =>
        canDeclareLine(props.status, line) ||
        canHandBackLine(line) ||
        remainderQuantity(line) !== null
    )
)

const actionClass =
  'cursor-pointer inline-flex items-center justify-center p-1.5 rounded text-primary hover:bg-accent transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <div class="border border-border rounded overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-muted/40 text-xs text-muted-foreground">
          <th class="px-3 py-2 font-semibold text-right w-10">#</th>
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
        <tr v-if="!lines.length">
          <td colspan="9" class="px-3 py-4 text-muted-foreground">
            {{ t('planning.transportOrders.lines.empty') }}
          </td>
        </tr>
        <tr v-for="line in lines" :key="line.lineNo" class="border-t border-border align-top">
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
            <span v-else class="text-muted-foreground">—</span>
          </td>
          <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
            {{ line.weightKg === null ? '—' : formatNumber(line.weightKg, 1) }}
          </td>
          <td class="px-3 py-2">
            <TransportOrderLineStatePill :state="orderLineState(line)" />
          </td>
          <td v-if="actionsShown" class="px-3 py-1.5 text-right whitespace-nowrap">
            <button
              v-if="canDeclareLine(status, line)"
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
              v-if="canHandBackLine(line)"
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
              v-if="remainderQuantity(line) !== null"
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
          <td colspan="6" class="px-3 py-2 text-right text-xs text-muted-foreground">
            {{ t('planning.transportOrders.lines.total') }}
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatNumber(totalWeightKg, 1) }}</td>
          <td :colspan="actionsShown ? 2 : 1" />
        </tr>
      </tfoot>
    </table>
  </div>
</template>
