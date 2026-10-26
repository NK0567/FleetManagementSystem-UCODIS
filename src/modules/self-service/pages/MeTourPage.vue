<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CircleCheck,
  CircleDashed,
  ClipboardCheck,
  Clock,
  Hourglass,
  Package,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  Truck
} from '@lucide/vue'
import type { MapMarker, MapPolyline } from '@/components/shared/MapView.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime, formatNumber } from '@/utils/format'
import { useMySpaceStore } from '../stores/mySpaceStore'

const { t } = useI18n()
const store = useMySpaceStore()
const optionsStore = useOptionsStore()

const DEPARTURE = {
  granted: { icon: ShieldCheck, tone: 'bg-success-bg text-success' },
  pending: { icon: Hourglass, tone: 'bg-warning-bg text-warning' },
  refused: { icon: ShieldX, tone: 'bg-destructive/10 text-destructive' },
  none: { icon: ShieldQuestion, tone: 'bg-neutral-bg text-neutral' }
} as const

const departure = computed(() => {
  const key = store.tour?.departureDecision ?? 'none'
  return { key, ...DEPARTURE[key] }
})

const markers = computed<MapMarker[]>(() =>
  (store.tour?.stops ?? []).flatMap((stop, index) =>
    stop.latitude == null || stop.longitude == null
      ? []
      : [
          {
            id: stop.siteNo,
            latitude: stop.latitude,
            longitude: stop.longitude,
            label: `${index + 1}. ${stop.name}`
          }
        ]
  )
)

const polylines = computed<MapPolyline[]>(() => [
  {
    id: 'tour',
    points: markers.value.map((marker) => [marker.latitude, marker.longitude]),
    dashed: true
  }
])

onMounted(() => void store.fetchTour())
</script>

<template>
  <div class="px-2 py-4 space-y-4 w-full max-w-3xl mx-auto">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">{{ t('selfService.tour.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('selfService.tour.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" @clear:error="store.clearError" />
    <LoadingSpinner v-if="store.loading && !store.tour" :text="t('common.loading')" />

    <section
      v-if="store.tourLoaded && !store.loading && !store.tour && !store.error"
      class="bg-card border border-border rounded p-6 flex flex-col items-center gap-2 text-center"
    >
      <Truck class="w-8 h-8 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">{{ t('selfService.tour.empty') }}</p>
    </section>

    <template v-if="store.tour">
      <section class="bg-card border border-border rounded p-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-lg font-semibold text-card-foreground">{{ store.tour.tripNo }}</p>
          <TripStatusPill :status="store.tour.status" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-start gap-2">
            <Truck class="w-5 h-5 text-primary shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">{{ t('selfService.tour.vehicle') }}</p>
              <p class="text-sm font-medium text-card-foreground truncate">
                {{ store.tour.vehiclePlate }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <Clock class="w-5 h-5 text-primary shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">
                {{ t('selfService.tour.plannedDeparture') }}
              </p>
              <p class="text-sm font-medium text-card-foreground">
                {{ formatDateTime(store.tour.plannedDeparture) }}
              </p>
            </div>
          </div>
        </div>
        <p
          class="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium"
          :class="departure.tone"
        >
          <component :is="departure.icon" class="w-5 h-5 shrink-0" />
          {{ t(`selfService.tour.departure.${departure.key}`) }}
        </p>
      </section>

      <section v-if="markers.length" class="bg-card border border-border rounded overflow-hidden">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('selfService.tour.route') }}
        </h2>
        <MapView :markers="markers" :polylines="polylines" height="260px" />
      </section>

      <section class="bg-card border border-border rounded">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('selfService.tour.stops') }}
        </h2>
        <ol class="divide-y divide-border">
          <li
            v-for="(stop, index) in store.tour.stops"
            :key="`${stop.siteNo}-${index}`"
            class="px-4 py-3 flex items-start gap-3"
          >
            <span
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              :class="stop.passedAt ? 'bg-success-bg text-success' : 'bg-primary/10 text-primary'"
            >
              {{ index + 1 }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-card-foreground">{{ stop.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ optionsStore.getOptionLabel('stopRole', stop.role) }}
                <span v-if="stop.city"> · {{ stop.city }}</span>
              </p>
            </div>
            <span
              class="flex items-center gap-1 text-xs shrink-0"
              :class="stop.passedAt ? 'text-success' : 'text-muted-foreground'"
            >
              <CircleCheck v-if="stop.passedAt" class="w-4 h-4" />
              <CircleDashed v-else class="w-4 h-4" />
              {{
                stop.passedAt
                  ? t('selfService.tour.passedAt', { date: formatDateTime(stop.passedAt) })
                  : t('selfService.tour.upcoming')
              }}
            </span>
          </li>
        </ol>
      </section>

      <section class="bg-card border border-border rounded">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('selfService.tour.lines') }}
        </h2>
        <p v-if="!store.tour.lines.length" class="p-4 text-sm text-muted-foreground">
          {{ t('selfService.tour.noLine') }}
        </p>
        <ul v-else class="divide-y divide-border">
          <li
            v-for="line in store.tour.lines"
            :key="`${line.orderNo}-${line.lineNo}`"
            class="px-4 py-3 flex items-start gap-3"
          >
            <Package class="w-5 h-5 text-primary shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-card-foreground">{{ line.deliveryPointName }}</p>
              <p class="text-xs text-muted-foreground">
                {{ line.productName }}<span v-if="line.city"> · {{ line.city }}</span>
              </p>
            </div>
            <span class="text-sm font-semibold tabular-nums text-card-foreground shrink-0">
              {{ formatNumber(line.quantity) }}
            </span>
          </li>
        </ul>
      </section>

      <div
        class="sticky bottom-0 -mx-2 px-2 py-3 bg-background border-t border-border sm:static sm:mx-0 sm:p-0 sm:bg-transparent sm:border-0 sm:flex sm:justify-end"
      >
        <RouterLink
          to="/me/checklist"
          class="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-2 px-4 rounded bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition"
        >
          <ClipboardCheck class="w-5 h-5" />
          {{ t('selfService.tour.openChecklist') }}
        </RouterLink>
      </div>
    </template>
  </div>
</template>
