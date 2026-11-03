<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Building2, MapPin, Truck } from '@lucide/vue'
import httpClient from '@/core/api/httpClient'
import type { MapMarker, MapPolyline } from '@/components/shared/MapView.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import type { TransportOrderApi } from '../types/transportOrder.types'

const props = defineProps<{ order: TransportOrderApi }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()

/* The position of the vehicle comes from the tracking of the fleet; it completes the status of the
 * order without replacing it (TRS02-US01 CA01). A carrier's vehicle is not tracked. */
interface OrderPosition {
  latitude: number
  longitude: number
  reportedAt: string
  placeName: string
  speedKmh: number
  situation: string
  nextStopName: string
  nextStopExpectedAt: string | null
  stops: { siteName: string; latitude: number; longitude: number }[]
}
const position = ref<OrderPosition | null>(null)
const TRACKED = ['planned', 'confirmed', 'ready', 'in_progress']
watch(
  () => [props.order.no, props.order.status, props.order.tripNo] as const,
  async ([no, status, tripNo]) => {
    position.value = null
    if (!tripNo || props.order.means !== 'fleet' || !TRACKED.includes(status)) return
    try {
      const response = await httpClient.get<{ data: { position: OrderPosition | null } }>(
        `/planning/transport-orders/${encodeURIComponent(no)}/eta`
      )
      position.value = response.data.data.position
    } catch {
      position.value = null
    }
  },
  { immediate: true }
)
const positionPlace = computed(() =>
  position.value
    ? position.value.placeName ||
      optionsStore.getOptionLabel('liveSituation', position.value.situation)
    : ''
)
const markers = computed<MapMarker[]>(() => {
  const current = position.value
  if (!current) return []
  return [
    ...current.stops.map((stop, index) => ({
      id: `stop-${index}`,
      latitude: stop.latitude,
      longitude: stop.longitude,
      label: stop.siteName,
      color: '#6b7280'
    })),
    {
      id: 'vehicle',
      latitude: current.latitude,
      longitude: current.longitude,
      label: props.order.vehiclePlate,
      sublabel: positionPlace.value,
      color: '#c2410c'
    }
  ]
})
const polylines = computed<MapPolyline[]>(() => [
  {
    id: 'route',
    points: (position.value?.stops ?? []).map((stop) => [stop.latitude, stop.longitude]),
    dashed: true
  }
])

const rows = computed(() =>
  props.order.means === 'carrier'
    ? [
        { label: t('planning.transportOrders.form.carrier'), value: props.order.carrierName },
        {
          label: t('planning.transportOrders.form.carrierVehicle'),
          value: props.order.carrierVehiclePlate
        },
        {
          label: t('planning.transportOrders.form.carrierDriver'),
          value: props.order.carrierDriverName
        }
      ]
    : [
        { label: t('planning.transportOrders.form.vehicle'), value: props.order.vehiclePlate },
        { label: t('planning.transportOrders.form.trailer'), value: props.order.trailerPlate },
        { label: t('planning.transportOrders.form.driver'), value: props.order.driverName }
      ]
)
</script>

<template>
  <div
    v-if="!order.means"
    class="rounded border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
  >
    <p class="font-medium text-card-foreground">{{ t('planning.transportOrders.means.none') }}</p>
    <p class="mt-1">{{ t('planning.transportOrders.means.noneHint') }}</p>
  </div>
  <div v-else class="rounded border border-border bg-card p-4 text-sm">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
        <Building2 v-if="order.means === 'carrier'" class="w-5 h-5 text-primary" />
        <Truck v-else class="w-5 h-5 text-primary" />
      </div>
      <div class="min-w-0">
        <p class="font-semibold text-card-foreground">
          {{
            order.means === 'carrier'
              ? t('planning.transportOrders.means.carrier')
              : t('planning.transportOrders.means.trip')
          }}
        </p>
        <RouterLink
          v-if="order.means === 'fleet' && order.tripNo"
          :to="{ path: '/fleet/trips', query: { no: order.tripNo, cardMode: 'view' } }"
          class="text-xs text-primary hover:underline"
        >
          {{ order.tripNo }}
        </RouterLink>
      </div>
    </div>
    <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2">
      <div v-for="row in rows" :key="row.label" class="min-w-0">
        <dt class="text-xs text-muted-foreground">{{ row.label }}</dt>
        <dd class="font-medium text-card-foreground truncate">{{ row.value || '·' }}</dd>
      </div>
    </dl>
    <div
      v-if="position"
      class="mt-4 border-t border-border pt-3 space-y-2"
      data-testid="order-position"
    >
      <p class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <MapPin class="w-4 h-4 text-primary" /> {{ t('planning.transportOrders.position.title') }}
      </p>
      <p class="text-sm text-card-foreground">
        {{ positionPlace }} · {{ position.latitude.toFixed(4) }},
        {{ position.longitude.toFixed(4) }}
        <span class="text-muted-foreground">
          ·
          {{
            t('planning.transportOrders.position.reportedAt', {
              at: formatDateTime(position.reportedAt)
            })
          }}
        </span>
      </p>
      <p v-if="position.nextStopName" class="text-xs text-muted-foreground">
        {{
          t('planning.transportOrders.position.next', {
            site: position.nextStopName,
            at: position.nextStopExpectedAt ? formatDateTime(position.nextStopExpectedAt) : '-'
          })
        }}
      </p>
      <MapView :markers="markers" :polylines="polylines" height="220px" />
    </div>
  </div>
</template>
