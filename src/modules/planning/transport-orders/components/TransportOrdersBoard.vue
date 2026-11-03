<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardCheck, Clock, Package, PhoneCall, Truck, User } from '@lucide/vue'
import type { ListFilter } from '@/core/types/crud.types'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import { orderLineState, type TransportOrderStatus } from '../domain/transportOrder'
import { transportOrderService } from '../services/transportOrderService'
import type { TransportOrderApi, TransportOrderLineApi } from '../types/transportOrder.types'

/**
 * The transport orders in columns, one per status of the workflow decided at the 26 September
 * review (pending, planned, confirmed, ready for execution, in progress, completed,
 * cancelled). A card opens the order; an order in progress whose lines are all dealt with
 * shows that it awaits completion.
 */
const props = defineProps<{ search?: string; reloadKey?: number; filters?: ListFilter[] }>()
const emit = defineEmits<{ open: [no: string] }>()
const { t } = useI18n()
const optionsStore = useOptionsStore()

const orders = ref<TransportOrderApi[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    // The same filters as the list: period, depot, region, late (v57).
    orders.value = (
      await transportOrderService.getAll({ page: 1, pageSize: 500, filters: props.filters ?? [] })
    ).data.items
    error.value = null
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.transportOrders.loadError'))
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => props.reloadKey, load)
watch(() => props.filters, load, { deep: true })

const matches = (order: TransportOrderApi) => {
  const q = (props.search ?? '').trim().toLowerCase()
  if (!q) return true
  return [
    order.no,
    order.recipientSummary,
    order.vehiclePlate,
    order.carrierName,
    order.driverName,
    order.routeName
  ]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

/**
 * One column per status of the workflow decided at the 26 September review and kept at the
 * 27 October one: pending, planned, confirmed, ready for execution, in progress, completed,
 * cancelled. The look follows the reference board (coloured columns, round counters, cards
 * with the order statistics).
 */
const COLUMNS: { status: TransportOrderStatus; tone: string; badge: string }[] = [
  { status: 'draft', tone: 'bg-[#eef4ff]', badge: 'bg-[#3b82f6]' },
  { status: 'planned', tone: 'bg-[#eef0ff]', badge: 'bg-[#6366f1]' },
  { status: 'confirmed', tone: 'bg-[#eaf6fb]', badge: 'bg-[#0ea5e9]' },
  { status: 'ready', tone: 'bg-[#e9f7f5]', badge: 'bg-[#14b8a6]' },
  { status: 'in_progress', tone: 'bg-[#fffbe8]', badge: 'bg-[#f59e0b]' },
  { status: 'completed', tone: 'bg-[#ecfbf1]', badge: 'bg-[#22c55e]' },
  { status: 'cancelled', tone: 'bg-[#fff1f0]', badge: 'bg-[#f87171]' }
]

const columns = computed(() =>
  COLUMNS.map((column) => ({
    ...column,
    items: orders.value.filter((order) => order.status === column.status && matches(order))
  }))
)

const PARCEL_EXCLUDED_UNITS = ['Litre', 'Kilogramme']
const isActive = (line: TransportOrderLineApi) => !line.replannedToOrderNo

/** Distinct orders of the recipients carried by the order. */
const ordersCount = (order: TransportOrderApi) =>
  new Set(order.lines.map((line) => line.deliveryRequestNo ?? `line-${line.lineNo}`)).size

/** Parcels, cartons and the like: what is loaded, else what is planned. Liquids and bulk do not count. */
const parcelsCount = (order: TransportOrderApi) =>
  order.lines
    .filter((line) => !PARCEL_EXCLUDED_UNITS.includes(line.unit))
    .reduce((sum, line) => sum + (line.loadedQuantity ?? line.quantity), 0)

function lineStats(order: TransportOrderApi) {
  const stats = {
    pending: 0,
    executed: 0,
    partial: 0,
    postponed: 0,
    returned: 0,
    notExecuted: 0,
    toReplan: 0
  }
  for (const line of order.lines) {
    const state = orderLineState(line)
    if (state === 'pending') stats.pending++
    else if (state === 'declared') {
      if (line.quantityGap) stats.partial++
      else stats.executed++
    } else if (state === 'postponed') {
      stats.postponed++
      if (isActive(line)) stats.toReplan++
    } else if (state === 'returned' || state === 'handed_back') stats.returned++
    else stats.notExecuted++
  }
  return stats
}
const STAT_KEYS = [
  'pending',
  'executed',
  'partial',
  'postponed',
  'returned',
  'notExecuted',
  'toReplan'
] as const

const vehicleOf = (order: TransportOrderApi) =>
  order.means === 'carrier'
    ? order.carrierVehiclePlate || order.carrierName
    : order.vehiclePlate || ''
const driverOf = (order: TransportOrderApi) =>
  order.means === 'carrier' ? order.carrierDriverName || order.carrierName : order.driverName
</script>

<template>
  <div class="flex-1 min-h-0 px-4 pb-4">
    <FormAlerts :error="error" @clear:error="error = null" />
    <LoadingBar v-if="loading" :height="2" bar-color="var(--color-primary)" />
    <div class="h-full overflow-x-auto">
      <div class="flex gap-4 h-full min-w-max">
        <section
          v-for="column in columns"
          :key="column.status"
          class="w-80 shrink-0 flex flex-col rounded-lg"
          :class="column.tone"
          :data-testid="`board-column-${column.status}`"
        >
          <header class="px-4 py-3 flex items-center justify-between gap-2">
            <h3 class="text-lg font-semibold text-foreground">
              {{ optionsStore.getOptionLabel('transportOrderStatus', column.status) }}
            </h3>
            <span
              class="min-w-6 h-6 px-1.5 rounded-full text-xs font-semibold text-white inline-flex items-center justify-center tabular-nums"
              :class="column.badge"
            >
              {{ column.items.length }}
            </span>
          </header>
          <div class="flex-1 overflow-y-auto px-2.5 pb-3 space-y-3">
            <p
              v-if="!column.items.length"
              class="pt-4 text-center text-sm italic text-muted-foreground"
            >
              {{ t('planning.transportOrders.board.emptyColumn') }}
            </p>
            <button
              v-for="order in column.items"
              :key="order.no"
              type="button"
              class="cursor-pointer w-full text-left bg-card border border-border rounded-lg shadow-sm hover:border-primary transition"
              @click="emit('open', order.no)"
            >
              <span class="block px-4 pt-3 pb-3 space-y-1.5">
                <span class="flex items-center justify-between gap-2">
                  <span class="text-base font-bold text-primary">{{ order.no }}</span>
                  <span class="flex items-center gap-2 text-muted-foreground">
                    <span
                      v-if="order.awaitingConfirmations"
                      class="inline-flex items-center gap-0.5 text-warning text-xs"
                      :title="
                        t(
                          'planning.transportOrders.awaitingConfirmations',
                          order.awaitingConfirmations
                        )
                      "
                    >
                      <PhoneCall class="w-3.5 h-3.5" /> {{ order.awaitingConfirmations }}
                    </span>
                    <span
                      v-if="order.awaitingClosing"
                      class="inline-flex items-center text-success"
                      :title="t('planning.transportOrders.view.awaitingClosing')"
                    >
                      <ClipboardCheck class="w-4 h-4" />
                    </span>
                    <Truck class="w-4 h-4" />
                  </span>
                </span>
                <span class="flex items-center justify-between gap-3 text-sm text-card-foreground">
                  <span class="flex items-center gap-1.5 min-w-0">
                    <User class="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span class="truncate">{{ driverOf(order) || '-' }}</span>
                  </span>
                  <span class="flex items-center gap-1.5 min-w-0">
                    <Truck class="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span class="truncate">{{ vehicleOf(order) || '-' }}</span>
                  </span>
                </span>
                <span
                  class="flex items-center justify-between gap-2 text-xs uppercase text-muted-foreground"
                >
                  <span class="truncate">{{ order.routeName || order.no }}</span>
                </span>
              </span>
              <span class="grid grid-cols-2 gap-x-3 border-t border-border px-4 py-3">
                <span>
                  <span class="block text-xs uppercase text-muted-foreground">
                    {{ t('planning.transportOrders.board.orders') }}
                  </span>
                  <span class="mt-1 flex items-center gap-1.5 text-lg font-bold">
                    <Package class="w-4 h-4 text-muted-foreground" /> {{ ordersCount(order) }}
                  </span>
                </span>
                <span>
                  <span class="block text-xs uppercase text-muted-foreground">
                    {{ t('planning.transportOrders.board.parcels') }}
                  </span>
                  <span class="mt-1 flex items-center gap-1.5 text-lg font-bold">
                    <Package class="w-4 h-4 text-muted-foreground" /> {{ parcelsCount(order) }}
                  </span>
                </span>
              </span>
              <span class="block border-t border-border px-4 py-3">
                <span class="block text-xs uppercase text-muted-foreground">
                  {{ t('planning.transportOrders.board.lineStats') }}
                </span>
                <span class="mt-2 flex flex-wrap gap-1.5">
                  <span
                    v-for="key in STAT_KEYS"
                    :key="key"
                    class="inline-flex items-center gap-1 rounded border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {{ t(`planning.transportOrders.board.stat.${key}`) }}
                    <span class="font-bold text-card-foreground tabular-nums">{{
                      lineStats(order)[key]
                    }}</span>
                  </span>
                </span>
                <span
                  v-if="order.status === 'in_progress' && order.expectedArrival"
                  class="mt-2 flex items-center gap-1 text-xs"
                  :class="order.late ? 'text-destructive font-medium' : 'text-muted-foreground'"
                >
                  <Clock class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">
                    {{ t('planning.transportOrders.board.eta') }}
                    {{ formatDateTime(order.expectedArrival) }}
                    <template v-if="order.delayMin">
                      · {{ t('planning.transportOrders.delay', { min: order.delayMin }) }}
                    </template>
                  </span>
                </span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
