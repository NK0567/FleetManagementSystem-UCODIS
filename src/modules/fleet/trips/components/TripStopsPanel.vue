<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, CircleDashed } from '@lucide/vue'
import type { MapMarker, MapPolyline } from '@/components/shared/MapView.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import type { TripStopApi } from '../types/trip.types'

const props = defineProps<{ stops: TripStopApi[] }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()

const PASSED_COLOR = '#16a34a'
const AHEAD_COLOR = '#6b7280'

const markers = computed<MapMarker[]>(() =>
  props.stops.map((stop, index) => ({
    id: `${index}`,
    latitude: stop.latitude,
    longitude: stop.longitude,
    label: `${index + 1}. ${stop.siteName}`,
    sublabel: optionsStore.getOptionLabel('stopRole', stop.role),
    color: stop.passedAt ? PASSED_COLOR : AHEAD_COLOR
  }))
)

const route = computed<MapPolyline[]>(() => [
  {
    id: 'route',
    points: props.stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
    dashed: true
  }
])
</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
    <ol class="space-y-2">
      <li
        v-for="(stop, index) in stops"
        :key="`${stop.siteNo}-${index}`"
        class="flex items-start gap-3 rounded border border-border px-3 py-2"
      >
        <CircleCheck v-if="stop.passedAt" class="w-5 h-5 text-success shrink-0 mt-0.5" />
        <CircleDashed v-else class="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-card-foreground">
            {{ index + 1 }}. {{ stop.siteName }}
            <span class="text-xs text-muted-foreground font-normal">
              · {{ optionsStore.getOptionLabel('stopRole', stop.role) }}
            </span>
          </p>
          <p class="text-xs text-muted-foreground">
            {{ t('fleet.trips.stops.planned', { time: formatDateTime(stop.plannedAt) }) }}
            <template v-if="stop.passedAt">
              · {{ t('fleet.trips.stops.passed', { time: formatDateTime(stop.passedAt) }) }}
            </template>
          </p>
        </div>
      </li>
    </ol>
    <MapView :markers="markers" :polylines="route" height="320px" />
  </div>
</template>
