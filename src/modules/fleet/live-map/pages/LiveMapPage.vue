<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { BellRing, Check, History, MapPinOff, Pause, Play, RotateCcw, Truck, X } from '@lucide/vue'
import { liveMapApi, type SimulationState } from '../api/liveMapApi'
import type { MapCircle, MapMarker, MapPolyline } from '@/components/shared/MapView.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { useOptionsStore } from '@/stores/optionsStore'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import { formatDateTime, formatNumber } from '@/utils/format'
import { LIVE_SITUATIONS, type LiveSituation } from '../domain/livePosition'
import { liveMapService } from '../services/liveMapService'
import type { LivePositionApi, TrackHistoryApi } from '../types/liveMap.types'

const REFRESH_MS = 10_000
const STOP_RADIUS_M = 1_500
const REPLAY_STEP_MS = 250

/** Leaflet draws in SVG attributes, which cannot read CSS variables. */
const SITUATION_COLORS: Record<LiveSituation, string> = {
  moving: '#16a34a',
  stopped: '#2563eb',
  parked: '#64748b',
  immobilized: '#dc2626',
  signal_lost: '#d97706'
}
const REPLAY_COLOR = '#7c3aed'

type Flag = 'alert' | 'outOfZone'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const optionsStore = useOptionsStore()
const { canRead: canReadVehicle } = usePermissions('VEHICLE')

const positions = ref<LivePositionApi[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const situation = ref<LiveSituation | null>(null)
const flag = ref<Flag | null>(null)
const selectedNo = ref<string | null>(null)
const cardNo = ref<string | null>(null)
const fitKey = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

async function refresh() {
  try {
    positions.value = await liveMapService.positions()
    // The server moves its clock ten minutes at each refresh while the simulation runs.
    if (simulation.value.active) simulation.value.offsetMin += 10
    error.value = null
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.liveMap.loadError'))
  } finally {
    loading.value = false
  }
}

/* No real GPS in the demonstration: the simulation runs the clock ahead so that the vehicles
 * on the road move, refreshed every two seconds while it runs. */
const SIMULATION_REFRESH_MS = 2_000
const simulation = ref<SimulationState>({ active: false, offsetMin: 0 })
function schedule() {
  if (timer) clearInterval(timer)
  timer = setInterval(refresh, simulation.value.active ? SIMULATION_REFRESH_MS : REFRESH_MS)
}
async function setSimulation(body: { active?: boolean; reset?: boolean }) {
  try {
    simulation.value = (await liveMapApi.setSimulation(body)).data.data
    schedule()
    await refresh()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.liveMap.loadError'))
  }
}

onMounted(async () => {
  try {
    simulation.value = (await liveMapApi.simulation()).data.data
  } catch {
    /* the map works without the simulation */
  }
  await refresh()
  schedule()
  // Coming from another screen: the vehicle is chosen, and its history opened on a given day.
  const vehicle = typeof route.query.vehicle === 'string' ? route.query.vehicle : null
  if (vehicle && positions.value.some((position) => position.vehicleNo === vehicle)) {
    selectedNo.value = vehicle
    const day = typeof route.query.day === 'string' ? route.query.day : null
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) openHistory(day)
  }
})

// The map polls only while it is on screen.
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  stopReplay()
})

const counts = computed(() =>
  LIVE_SITUATIONS.map((value) => ({
    value,
    count: positions.value.filter((position) => position.situation === value).length
  }))
)

const flagCounts = computed(() => [
  {
    value: 'alert' as const,
    icon: BellRing,
    count: positions.value.filter((position) => position.alertCount > 0).length
  },
  {
    value: 'outOfZone' as const,
    icon: MapPinOff,
    count: positions.value.filter((position) => position.outOfZone).length
  }
])

const visible = computed(() =>
  positions.value.filter(
    (position) =>
      (!situation.value || position.situation === situation.value) &&
      (flag.value !== 'alert' || position.alertCount > 0) &&
      (flag.value !== 'outOfZone' || position.outOfZone)
  )
)

const selected = computed(
  () => positions.value.find((position) => position.vehicleNo === selectedNo.value) ?? null
)

/* ── History: the recorded positions of a period, replayed on the map (FLT04-US01) ── */
const historyOpen = ref(false)
const historyFrom = ref('')
const historyTo = ref('')
const history = ref<TrackHistoryApi | null>(null)
const historyLoading = ref(false)
const historyError = ref<string | null>(null)
const replayIndex = ref(0)
const playing = ref(false)
let replayTimer: ReturnType<typeof setInterval> | null = null

const toInput = (value: string) => value.slice(0, 16)

function defaultPeriod(day?: string) {
  if (day) {
    historyFrom.value = `${day}T00:00`
    historyTo.value = `${day}T23:59`
    return
  }
  historyFrom.value = `${todayIso()}T00:00`
  historyTo.value = toInput(nowIsoDateTime())
}

const periodInvalid = computed(
  () => !!historyFrom.value && !!historyTo.value && historyFrom.value > historyTo.value
)

async function loadHistory() {
  stopReplay()
  history.value = null
  historyError.value = null
  if (!selectedNo.value || !historyFrom.value || !historyTo.value || periodInvalid.value) return
  historyLoading.value = true
  try {
    history.value = await liveMapService.history(
      selectedNo.value,
      historyFrom.value,
      historyTo.value
    )
    replayIndex.value = history.value.points.length ? history.value.points.length - 1 : 0
  } catch (cause) {
    historyError.value = apiErrorMessage(cause, t('fleet.liveMap.history.loadError'))
  } finally {
    historyLoading.value = false
  }
}

function openHistory(day?: string) {
  defaultPeriod(day)
  historyOpen.value = true
  void loadHistory()
}

function toggleHistory() {
  if (historyOpen.value) closeHistory()
  else openHistory()
}

function closeHistory() {
  stopReplay()
  historyOpen.value = false
  history.value = null
}

watch([historyFrom, historyTo], () => {
  if (historyOpen.value) void loadHistory()
})

const replayPoint = computed(() => {
  const points = history.value?.points ?? []
  return points[Math.min(replayIndex.value, points.length - 1)] ?? null
})

function stopReplay() {
  playing.value = false
  if (replayTimer) clearInterval(replayTimer)
  replayTimer = null
}

function togglePlay() {
  const points = history.value?.points ?? []
  if (playing.value) {
    stopReplay()
    return
  }
  if (!points.length) return
  if (replayIndex.value >= points.length - 1) replayIndex.value = 0
  playing.value = true
  replayTimer = setInterval(() => {
    if (replayIndex.value >= points.length - 1) {
      stopReplay()
      return
    }
    replayIndex.value++
  }, REPLAY_STEP_MS)
}

/* ── Map content ── */
const markers = computed<MapMarker[]>(() =>
  visible.value.map((position) => {
    const replaying =
      historyOpen.value && position.vehicleNo === selectedNo.value && replayPoint.value
    return {
      id: position.vehicleNo,
      latitude: replaying ? replayPoint.value!.latitude : position.latitude,
      longitude: replaying ? replayPoint.value!.longitude : position.longitude,
      label: position.plate,
      sublabel: [
        position.driverName,
        replaying
          ? formatDateTime(replayPoint.value!.at)
          : optionsStore.getOptionLabel('liveSituation', position.situation)
      ]
        .filter(Boolean)
        .join(' · '),
      color: replaying ? REPLAY_COLOR : SITUATION_COLORS[position.situation]
    }
  })
)

const polylines = computed<MapPolyline[]>(() => {
  if (historyOpen.value && history.value) {
    const travelled = history.value.points.slice(0, replayIndex.value + 1)
    return travelled.length > 1
      ? [
          {
            id: 'history',
            points: travelled.map((point) => [point.latitude, point.longitude]),
            color: REPLAY_COLOR
          }
        ]
      : []
  }
  return selected.value && selected.value.stops.length > 1
    ? [
        {
          id: 'route',
          points: selected.value.stops.map((stop) => [stop.latitude, stop.longitude]),
          color: '#64748b',
          dashed: true
        }
      ]
    : []
})

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

function toggleFlag(value: Flag) {
  flag.value = flag.value === value ? null : value
  fitKey.value++
}

/** A click on a vehicle, in the list or on the map, opens its card and keeps it selected. */
function openVehicle(no: string) {
  if (selectedNo.value !== no && historyOpen.value) closeHistory()
  selectedNo.value = no
  if (canReadVehicle.value) cardNo.value = no
}

function unselect() {
  closeHistory()
  selectedNo.value = null
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
        <div class="flex flex-wrap items-center gap-2 mt-2">
          <button
            type="button"
            class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border transition"
            :class="
              simulation.active
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-card-foreground hover:bg-accent'
            "
            @click="setSimulation({ active: !simulation.active })"
          >
            <component :is="simulation.active ? Pause : Play" class="w-4 h-4" />
            {{
              simulation.active
                ? t('fleet.liveMap.simulation.stop')
                : t('fleet.liveMap.simulation.start')
            }}
          </button>
          <button
            v-if="simulation.offsetMin"
            type="button"
            class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-border text-card-foreground hover:bg-accent"
            @click="setSimulation({ reset: true })"
          >
            <RotateCcw class="w-4 h-4" /> {{ t('fleet.liveMap.simulation.reset') }}
          </button>
          <span v-if="simulation.offsetMin" class="text-xs text-muted-foreground">
            {{ t('fleet.liveMap.simulation.ahead', { minutes: simulation.offsetMin }) }}
          </span>
        </div>
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
        <button
          v-for="item in flagCounts"
          :key="item.value"
          type="button"
          class="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded border transition"
          :class="
            flag === item.value
              ? 'border-primary bg-accent text-card-foreground'
              : 'border-border text-muted-foreground hover:bg-accent'
          "
          @click="toggleFlag(item.value)"
        >
          <component :is="item.icon" class="w-4 h-4 text-destructive" />
          {{ t(`fleet.liveMap.flag.${item.value}`) }}
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
          :title="t('fleet.liveMap.openCard')"
          @click="openVehicle(position.vehicleNo)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-card-foreground">{{ position.plate }}</span>
            <span class="flex items-center gap-1">
              <BellRing
                v-if="position.alertCount"
                class="w-4 h-4 text-destructive"
                :aria-label="t('fleet.liveMap.alertCount', { count: position.alertCount })"
              />
              <MapPinOff
                v-if="position.outOfZone"
                class="w-4 h-4 text-destructive"
                :aria-label="t('fleet.liveMap.flag.outOfZone')"
              />
              <LiveSituationPill :situation="position.situation" />
            </span>
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
          @marker-click="openVehicle"
        />

        <section
          v-if="historyOpen && selected"
          class="rounded border border-border p-4 space-y-3"
          :aria-label="t('fleet.liveMap.history.title')"
        >
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold text-card-foreground">
              {{ t('fleet.liveMap.history.title') }} · {{ selected.plate }}
            </h2>
            <button
              type="button"
              class="cursor-pointer text-muted-foreground hover:text-card-foreground"
              :aria-label="t('common.close')"
              @click="closeHistory"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 max-w-xl">
            <BaseFormField :label="t('fleet.liveMap.history.from')">
              <FormInput v-model="historyFrom" type="datetime-local" :invalid="periodInvalid" />
            </BaseFormField>
            <BaseFormField :label="t('fleet.liveMap.history.to')">
              <FormInput v-model="historyTo" type="datetime-local" :invalid="periodInvalid" />
            </BaseFormField>
          </div>
          <p v-if="periodInvalid" class="text-sm text-destructive">
            {{ t('fleet.liveMap.history.periodInvalid') }}
          </p>
          <p v-else-if="historyError" class="text-sm text-destructive">{{ historyError }}</p>
          <LoadingBar v-else-if="historyLoading" :height="2" bar-color="var(--color-primary)" />
          <p v-else-if="history && !history.points.length" class="text-sm text-muted-foreground">
            {{ t('fleet.liveMap.history.empty') }}
          </p>
          <template v-else-if="history">
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="cursor-pointer w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                :aria-label="
                  playing ? t('fleet.liveMap.history.pause') : t('fleet.liveMap.history.play')
                "
                :title="
                  playing ? t('fleet.liveMap.history.pause') : t('fleet.liveMap.history.play')
                "
                @click="togglePlay"
              >
                <component :is="playing ? Pause : Play" class="w-4 h-4" />
              </button>
              <input
                v-model.number="replayIndex"
                type="range"
                min="0"
                :max="history.points.length - 1"
                class="flex-1"
                :aria-label="t('fleet.liveMap.history.position')"
              />
            </div>
            <dl v-if="replayPoint" class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <dt class="text-xs text-muted-foreground">{{ t('fleet.liveMap.history.at') }}</dt>
                <dd>{{ formatDateTime(replayPoint.at) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ t('fleet.liveMap.history.speed') }}
                </dt>
                <dd>{{ t('fleet.liveMap.speed', { speed: replayPoint.speedKmh }) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ t('fleet.liveMap.history.place') }}
                </dt>
                <dd>
                  {{
                    replayPoint.placeName ||
                    `${formatNumber(replayPoint.latitude, 4)}, ${formatNumber(replayPoint.longitude, 4)}`
                  }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">{{ t('fleet.liveMap.history.trip') }}</dt>
                <dd>{{ replayPoint.tripNo }}</dd>
              </div>
            </dl>
            <p class="text-xs text-muted-foreground">
              {{
                t('fleet.liveMap.history.summary', {
                  points: history.points.length,
                  trips: history.tripNos.length,
                  events: history.eventCount
                })
              }}
            </p>
          </template>
        </section>

        <section v-if="selected" class="rounded border border-border p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-semibold text-card-foreground">
              {{ selected.plate }}
              <span v-if="selected.routeName" class="font-normal text-muted-foreground">
                · {{ selected.routeName }}
              </span>
            </h2>
            <div class="flex flex-wrap items-center gap-2">
              <RouterLink
                v-if="selected.tripNo"
                :to="{ path: '/fleet/trips', query: { no: selected.tripNo, cardMode: 'view' } }"
                class="text-sm text-primary hover:underline"
              >
                {{ selected.tripNo }}
              </RouterLink>
              <button
                v-if="canReadVehicle"
                type="button"
                class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90"
                @click="cardNo = selected.vehicleNo"
              >
                <Truck class="w-4 h-4" /> {{ t('fleet.liveMap.openCard') }}
              </button>
              <button
                type="button"
                class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border transition"
                :class="
                  historyOpen
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-card-foreground hover:bg-accent'
                "
                @click="toggleHistory"
              >
                <History class="w-4 h-4" /> {{ t('fleet.liveMap.history.button') }}
              </button>
              <button
                type="button"
                class="cursor-pointer text-muted-foreground hover:text-card-foreground"
                :aria-label="t('common.close')"
                @click="unselect"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
          <p class="text-xs text-muted-foreground">
            {{ t('fleet.liveMap.reportedAt', { date: formatDateTime(selected.reportedAt) }) }}
            · {{ t('fleet.liveMap.speed', { speed: selected.speedKmh }) }} ·
            {{ optionsStore.getOptionLabel('liveSituation', selected.situation) }}
            <template v-if="selected.delayMin !== null">
              · {{ delayLabel(selected.delayMin) }}
            </template>
          </p>
          <p v-if="selected.alertCount || selected.outOfZone" class="text-xs text-destructive">
            <template v-if="selected.alertCount">
              {{ t('fleet.liveMap.alertCount', { count: selected.alertCount }) }}
            </template>
            <template v-if="selected.alertCount && selected.outOfZone"> · </template>
            <template v-if="selected.outOfZone">
              {{
                selected.corridorGapM !== null
                  ? t('fleet.liveMap.outOfCorridor', {
                      km: formatNumber(selected.corridorGapM / 1000, 1)
                    })
                  : t('fleet.liveMap.outOfSites')
              }}
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

    <VehicleCard
      v-if="cardNo"
      :key="cardNo"
      :vehicle-no="cardNo"
      initial-open-mode="view"
      @close="cardNo = null"
      @create="router.push('/fleet/vehicles')"
    />
  </div>
</template>
