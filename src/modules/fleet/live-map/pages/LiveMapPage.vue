<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from '@lucide/vue'
import type { MapCircle, MapMarker, MapPolyline } from '@/components/shared/MapView.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import { LIVE_SITUATIONS, type LiveSituation } from '../domain/livePosition'
import { liveMapService } from '../services/liveMapService'
import type { LivePositionApi } from '../types/liveMap.types'

const REFRESH_MS = 10_000
const STOP_RADIUS_M = 1_500

/** Leaflet draws in SVG attributes, which cannot read CSS variables. */
const SITUATION_COLORS: Record<LiveSituation, string> = {
  moving: '#16a34a',
  stopped: '#2563eb',
  parked: '#64748b',
  immobilized: '#dc2626',
  signal_lost: '#d97706'
}

const { t } = useI18n()
const optionsStore = useOptionsStore()

const positions = ref<LivePositionApi[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const situation = ref<LiveSituation | null>(null)
const selectedNo = ref<string | null>(null)
const fitKey = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

async function refresh() {
  try {
    positions.value = await liveMapService.positions()
    error.value = null
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.liveMap.loadError'))
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await refresh()
  timer = setInterval(refresh, REFRESH_MS)
})

// The map polls only while it is on screen.
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const counts = computed(() =>
  LIVE_SITUATIONS.map((value) => ({
    value,
    count: positions.value.filter((position) => position.situation === value).length
  }))
)

const visible = computed(() =>
  situation.value
    ? positions.value.filter((position) => position.situation === situation.value)
    : positions.value
)

const selected = computed(
  () => positions.value.find((position) => position.vehicleNo === selectedNo.value) ?? null
)

const markers = computed<MapMarker[]>(() =>
  visible.value.map((position) => ({
    id: position.vehicleNo,
    latitude: position.latitude,
    longitude: position.longitude,
    label: position.plate,
    sublabel: [
      position.driverName,
      optionsStore.getOptionLabel('liveSituation', position.situation)
    ]
      .filter(Boolean)
      .join(' · '),
    color: SITUATION_COLORS[position.situation]
  }))
)

const polylines = computed<MapPolyline[]>(() =>
  selected.value && selected.value.stops.length > 1
    ? [
        {
          id: 'route',
          points: selected.value.stops.map((stop) => [stop.latitude, stop.longitude]),
          color: '#64748b',
          dashed: true
        }
      ]
    : []
)

const circles = computed<MapCircle[]>(() =>
  (selected.value?.stops ?? []).map((stop, index) => ({
    id: `stop-${index}`,
    latitude: stop.latitude,
    longitude: stop.longitude,
    radiusM: STOP_RADIUS_M,
    label: stop.siteName
  }))
)

function toggleSituation(value: LiveSituation) {
  situation.value = situation.value === value ? null : value
  fitKey.value++
}

function select(no: string) {
  selectedNo.value = selectedNo.value === no ? null : no
}

const time = (value: string | null) => (value ? formatDateTime(value).slice(-5) : '')

function delayLabel(minutes: number | null) {
  if (minutes === null) return ''
  if (minutes > 0) return t('fleet.liveMap.late', { minutes })
  if (minutes < 0) return t('fleet.liveMap.early', { minutes: -minutes })
  return t('fleet.liveMap.onTime')
}
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">{{ t('fleet.liveMap.title') }}</h1>
        <p class="text-sm text-muted-foreground">{{ t('fleet.liveMap.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="item in counts"
          :key="item.value"
          type="button"
          class="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded border transition"
          :class="
            situation === item.value
              ? 'border-primary bg-accent text-card-foreground'
              : 'border-border text-muted-foreground hover:bg-accent'
          "
          @click="toggleSituation(item.value)"
        >
          <span
            class="w-2.5 h-2.5 rounded-full"
            :style="{ backgroundColor: SITUATION_COLORS[item.value] }"
          />
          {{ optionsStore.getOptionLabel('liveSituation', item.value) }}
          <span class="font-semibold text-card-foreground">{{ item.count }}</span>
        </button>
      </div>
    </header>

    <FormAlerts :error="error" @clear:error="error = null" />

    <LoadingSpinner v-if="loading" :text="t('common.loading')" />

    <div v-else class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside class="space-y-2 lg:max-h-[640px] lg:overflow-y-auto">
        <p v-if="!visible.length" class="text-sm text-muted-foreground">
          {{ t('fleet.liveMap.noVehicle') }}
        </p>
        <button
          v-for="position in visible"
          :key="position.vehicleNo"
          type="button"
          class="cursor-pointer w-full text-left rounded border px-3 py-2 transition"
          :class="
            position.vehicleNo === selectedNo
              ? 'border-primary bg-accent'
              : 'border-border hover:bg-accent'
          "
          @click="select(position.vehicleNo)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-card-foreground">{{ position.plate }}</span>
            <LiveSituationPill :situation="position.situation" />
          </div>
          <p class="text-xs text-muted-foreground truncate">
            {{ [position.driverName, position.tripNo].filter(Boolean).join(' · ') }}
          </p>
          <p class="text-xs text-muted-foreground truncate">
            <template v-if="position.situation === 'signal_lost'">
              {{ t('fleet.liveMap.lastSignal', { time: time(position.reportedAt) }) }}
            </template>
            <template v-else-if="position.situation === 'moving'">
              {{ t('fleet.liveMap.speed', { speed: position.speedKmh }) }}
              <template v-if="position.nextStopName">
                · {{ t('fleet.liveMap.towards', { site: position.nextStopName }) }}
              </template>
            </template>
            <template v-else>{{ position.placeName }}</template>
          </p>
        </button>
      </aside>

      <div class="space-y-4 min-w-0">
        <MapView
          :markers="markers"
          :polylines="polylines"
          :circles="circles"
          :selected-id="selectedNo"
          :fit-key="fitKey"
          height="460px"
          @marker-click="select"
        />

        <section v-if="selected" class="rounded border border-border p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-semibold text-card-foreground">
              {{ selected.plate }}
              <span v-if="selected.routeName" class="font-normal text-muted-foreground">
                · {{ selected.routeName }}
              </span>
            </h2>
            <RouterLink
              v-if="selected.tripNo"
              :to="{ path: '/fleet/trips', query: { no: selected.tripNo, cardMode: 'view' } }"
              class="text-sm text-primary hover:underline"
            >
              {{ selected.tripNo }}
            </RouterLink>
          </div>
          <p class="text-xs text-muted-foreground">
            {{ t('fleet.liveMap.reportedAt', { date: formatDateTime(selected.reportedAt) }) }}
            <template v-if="selected.delayMin !== null">
              · {{ delayLabel(selected.delayMin) }}
            </template>
          </p>
          <table v-if="selected.stops.length" class="w-full text-sm">
            <thead class="text-xs text-muted-foreground">
              <tr>
                <th class="text-left font-normal py-1">{{ t('fleet.liveMap.stop') }}</th>
                <th class="text-right font-normal py-1">{{ t('fleet.liveMap.planned') }}</th>
                <th class="text-right font-normal py-1">{{ t('fleet.liveMap.expected') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(stop, index) in selected.stops"
                :key="index"
                class="border-t border-border"
              >
                <td class="py-1 text-card-foreground">
                  <Check v-if="stop.passed" class="inline w-4 h-4 text-primary" />
                  {{ stop.siteName }}
                </td>
                <td class="py-1 text-right text-muted-foreground">{{ time(stop.plannedAt) }}</td>
                <td
                  class="py-1 text-right"
                  :class="
                    stop.expectedAt > stop.plannedAt ? 'text-destructive' : 'text-card-foreground'
                  "
                >
                  {{ time(stop.expectedAt) }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-muted-foreground">{{ t('fleet.liveMap.noTrip') }}</p>
        </section>
      </div>
    </div>
  </div>
</template>
