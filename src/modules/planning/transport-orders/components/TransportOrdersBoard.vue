<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardCheck, PhoneCall, Truck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import { TRANSPORT_ORDER_STATUSES, type TransportOrderStatus } from '../domain/transportOrder'
import { transportOrderService } from '../services/transportOrderService'
import type { TransportOrderApi } from '../types/transportOrder.types'

/**
 * The transport orders in columns, one per status of the workflow decided at the 26 September
 * review (pending, planned, confirmed, ready for execution, in progress, completed,
 * cancelled). A card opens the order; an order in progress whose lines are all dealt with
 * shows that it awaits completion.
 */
const props = defineProps<{ search?: string; reloadKey?: number }>()
const emit = defineEmits<{ open: [no: string] }>()
const { t } = useI18n()
const optionsStore = useOptionsStore()

const orders = ref<TransportOrderApi[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const TONES: Record<TransportOrderStatus, string> = {
  draft: 'border-t-warning',
  planned: 'border-t-info',
  confirmed: 'border-t-info',
  ready: 'border-t-info',
  in_progress: 'border-t-primary',
  completed: 'border-t-success',
  cancelled: 'border-t-destructive'
}

async function load() {
  loading.value = true
  try {
    orders.value = (await transportOrderService.getAll({ page: 1, pageSize: 500 })).data.items
    error.value = null
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.transportOrders.loadError'))
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => props.reloadKey, load)

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

const columns = computed(() =>
  TRANSPORT_ORDER_STATUSES.map((status) => ({
    status,
    items: orders.value.filter((order) => order.status === status && matches(order))
  }))
)
const meansOf = (order: TransportOrderApi) =>
  order.means === 'carrier'
    ? [order.carrierName, order.carrierVehiclePlate].filter(Boolean).join(' · ')
    : order.means === 'fleet'
      ? [order.vehiclePlate, order.driverName].filter(Boolean).join(' · ')
      : t('planning.transportOrders.means.none')
</script>

<template>
  <div class="flex-1 min-h-0 px-4 pb-4">
    <FormAlerts :error="error" @clear:error="error = null" />
    <LoadingBar v-if="loading" :height="2" bar-color="var(--color-primary)" />
    <div class="h-full overflow-x-auto">
      <div class="flex gap-3 h-full min-w-max">
        <section
          v-for="column in columns"
          :key="column.status"
          class="w-72 shrink-0 flex flex-col bg-muted/40 border border-border border-t-4 rounded"
          :class="TONES[column.status]"
        >
          <header class="px-3 py-2 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-card-foreground">
              {{ optionsStore.getOptionLabel('transportOrderStatus', column.status) }}
            </h3>
            <span class="text-xs tabular-nums text-muted-foreground">{{
              column.items.length
            }}</span>
          </header>
          <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
            <p v-if="!column.items.length" class="px-1 text-xs text-muted-foreground">
              {{ t('planning.transportOrders.board.empty') }}
            </p>
            <button
              v-for="order in column.items"
              :key="order.no"
              type="button"
              class="cursor-pointer w-full text-left bg-card border border-border rounded p-2.5 hover:border-primary transition space-y-1"
              @click="emit('open', order.no)"
            >
              <span class="flex items-center justify-between gap-2">
                <span class="text-sm font-semibold text-primary">{{ order.no }}</span>
                <span class="flex items-center gap-1.5">
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
                    <ClipboardCheck class="w-3.5 h-3.5" />
                  </span>
                </span>
              </span>
              <span class="block text-sm text-card-foreground truncate">
                {{ order.recipientSummary || '·' }}
              </span>
              <span class="block text-xs text-muted-foreground">
                {{ formatDateTime(order.plannedDeparture) }}
                <template v-if="order.routeName"> · {{ order.routeName }}</template>
              </span>
              <span class="flex items-center gap-1 text-xs text-muted-foreground">
                <Truck class="w-3.5 h-3.5 shrink-0" />
                <span class="truncate">{{ meansOf(order) }}</span>
              </span>
              <span class="block text-xs text-muted-foreground">
                {{ t('planning.transportOrders.lines.count', order.lineCount) }}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
