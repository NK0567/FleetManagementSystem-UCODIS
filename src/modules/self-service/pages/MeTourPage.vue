<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import type { MapMarker, MapPolyline } from '@/components/shared/MapView.vue'
import type { SingleResponse } from '@/types/api-response.types'

interface TourStop {
  siteNo: string
  name: string
  role: string
  latitude: number | null
  longitude: number | null
  passedAt: string | null
}

interface TourLine {
  orderNo: string
  lineNo: number
  deliveryPointName: string
  city: string
  productName: string
  quantity: number
}

interface Tour {
  tripNo: string
  status: string
  plannedDeparture: string
  vehiclePlate: string
  departureDecision: 'granted' | 'pending' | 'refused' | null
  stops: TourStop[]
  lines: TourLine[]
}

const { t } = useI18n()
const tour = ref<Tour | null>(null)
const loaded = ref(false)
const error = ref<string | null>(null)

const markers = computed<MapMarker[]>(() =>
  (tour.value?.stops ?? [])
    .filter((stop) => stop.latitude != null && stop.longitude != null)
    .map((stop, index) => ({
      id: stop.siteNo,
      latitude: stop.latitude as number,
      longitude: stop.longitude as number,
      label: `${index + 1}. ${stop.name}`
    }))
)

const lines = computed<MapPolyline[]>(() => [
  {
    id: 'tour',
    points: markers.value.map((marker) => [marker.latitude, marker.longitude]),
    dashed: true
  }
])

onMounted(async () => {
  try {
    tour.value = (await httpClient.get<SingleResponse<Tour | null>>('/me/tour')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.tour.loadError'))
  } finally {
    loaded.value = true
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('selfService.tour.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('selfService.tour.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <div v-if="loaded && !tour" class="p-4 text-sm">{{ t('selfService.tour.empty') }}</div>
    <div v-if="tour" class="p-4 space-y-4 text-sm">
      <p>{{ tour.tripNo }} · {{ tour.vehiclePlate }} · {{ tour.plannedDeparture }}</p>
      <p>{{ t(`selfService.tour.departure.${tour.departureDecision ?? 'none'}`) }}</p>
      <MapView v-if="markers.length" :markers="markers" :polylines="lines" height="280px" />
      <ol class="space-y-1 list-decimal pl-4">
        <li v-for="stop in tour.stops" :key="stop.siteNo">
          {{ stop.name }}
          <span v-if="stop.passedAt">· {{ stop.passedAt }}</span>
        </li>
      </ol>
      <h2 class="font-semibold">{{ t('selfService.tour.lines') }}</h2>
      <p v-if="tour.lines.length === 0">{{ t('selfService.tour.noLine') }}</p>
      <ul v-else class="space-y-1">
        <li v-for="line in tour.lines" :key="`${line.orderNo}-${line.lineNo}`">
          {{ line.deliveryPointName }} ({{ line.city }}) · {{ line.productName }} ·
          {{ line.quantity }}
        </li>
      </ul>
      <router-link class="text-primary underline" to="/me/checklist">
        {{ t('selfService.tour.checklist') }}
      </router-link>
    </div>
  </div>
</template>
