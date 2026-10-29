<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { tripService, type TripApi } from '@/modules/fleet/trips'
import { transportOrderService } from '@/modules/planning/transport-orders/services/transportOrderService'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { formatDate, formatDateTime } from '@/utils/format'
import { todayIso } from '@/utils/date'
import { addDays, overlappingKeys, weekStart } from '../domain/calendar'

type RowKind = 'vehicles' | 'drivers'

interface Bar {
  key: string
  tripNo: string
  orderNos: string[]
  label: string
  start: string
  end: string
  status: string
}

interface Row {
  no: string
  label: string
  bars: Bar[]
}

const { t } = useI18n()
const router = useRouter()

const monday = ref(weekStart(todayIso()))
const kind = ref<RowKind>('vehicles')
const loading = ref(false)
const error = ref<string | null>(null)
const trips = ref<TripApi[]>([])
const orders = ref<TransportOrderApi[]>([])
const vehicleRows = ref<{ no: string; label: string }[]>([])
const driverRows = ref<{ no: string; label: string }[]>([])

const days = computed(() => Array.from({ length: 7 }, (_, index) => addDays(monday.value, index)))
const weekFrom = computed(() => `${monday.value}T00:00:00`)
const weekTo = computed(() => `${addDays(monday.value, 7)}T00:00:00`)
const winFrom = weekFrom
const winTo = weekTo
const columns = computed(() => days.value.map((day) => ({ key: day, label: formatDate(day), day })))
const today = todayIso()

async function load() {
  loading.value = true
  error.value = null
  try {
    const [tripPage, orderPage, window] = await Promise.all([
      tripService.getAll({ page: 1, pageSize: 500, sortBy: 'plannedDeparture' }),
      transportOrderService.getAll({ page: 1, pageSize: 500, sortBy: 'plannedDeparture' }),
      transportOrderService.availability(weekFrom.value, `${addDays(monday.value, 6)}T23:59:00`)
    ])
    trips.value = tripPage.data.items.filter(
      (trip) => trip.status !== 'cancelled' && trip.plannedArrival && trip.plannedDeparture
    )
    orders.value = orderPage.data.items
    vehicleRows.value = window.vehicles
      .filter((item) => item.role === 'motorized' || item.role === 'towed')
      .map((item) => ({ no: item.no, label: item.label }))
      .sort((a, b) => a.label.localeCompare(b.label))
    driverRows.value = window.drivers
      .map((item) => ({ no: item.no, label: item.label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.calendar.loadError'))
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(monday, load)

const ordersByTrip = computed(() => {
  const map = new Map<string, string[]>()
  for (const order of orders.value) {
    if (!order.tripNo || order.status === 'cancelled') continue
    map.set(order.tripNo, [...(map.get(order.tripNo) ?? []), order.no])
  }
  return map
})

function barOf(trip: TripApi): Bar {
  return {
    key: trip.no,
    tripNo: trip.no,
    orderNos: ordersByTrip.value.get(trip.no) ?? [],
    label: trip.routeName || trip.no,
    start: trip.plannedDeparture,
    end: trip.plannedArrival,
    status: trip.status
  }
}

/* Only the trips that touch the week; each row lists what holds that vehicle or driver. */
const weekTrips = computed(() =>
  trips.value.filter(
    (trip) => trip.plannedDeparture < winTo.value && trip.plannedArrival > winFrom.value
  )
)

const rows = computed<Row[]>(() => {
  const source = kind.value === 'vehicles' ? vehicleRows.value : driverRows.value
  return source.map((resource) => ({
    ...resource,
    bars: weekTrips.value
      .filter((trip) =>
        kind.value === 'vehicles'
          ? trip.vehicleNo === resource.no || trip.trailerNo === resource.no
          : trip.driverNo === resource.no
      )
      .map(barOf)
  }))
})

const overlaps = computed(() => {
  const keys = new Set<string>()
  for (const row of rows.value) {
    for (const key of overlappingKeys(row.bars)) keys.add(`${row.no}|${key}`)
  }
  return keys
})
const overlapCount = computed(() => overlaps.value.size)

const onlyBusy = ref(false)
const shownRows = computed(() =>
  onlyBusy.value ? rows.value.filter((row) => row.bars.length) : rows.value
)

const span = computed(() => new Date(winTo.value).getTime() - new Date(winFrom.value).getTime())
function position(bar: Bar) {
  const from = Math.max(new Date(bar.start).getTime(), new Date(winFrom.value).getTime())
  const to = Math.min(new Date(bar.end).getTime(), new Date(winTo.value).getTime())
  const base = new Date(winFrom.value).getTime()
  const left = ((from - base) / span.value) * 100
  const width = Math.max(((to - from) / span.value) * 100, 0.6)
  return { left: `${left}%`, width: `${width}%` }
}

function open(bar: Bar) {
  const orderNo = bar.orderNos[0]
  if (orderNo) {
    void router.push({
      path: '/planning/transport-orders',
      query: { no: orderNo, cardMode: 'view' }
    })
  } else {
    void router.push({ path: '/fleet/trips', query: { no: bar.tripNo, cardMode: 'view' } })
  }
}

function barTitle(bar: Bar) {
  return [
    bar.orderNos.length ? bar.orderNos.join(', ') : bar.tripNo,
    bar.label,
    `${formatDateTime(bar.start)} → ${formatDateTime(bar.end)}`
  ].join(' · ')
}

const weekLabel = computed(() =>
  t('planning.calendar.week', {
    from: formatDate(days.value[0]!),
    to: formatDate(days.value[6]!)
  })
)

const tabClass = (active: boolean) =>
  `cursor-pointer px-3 py-1.5 text-sm border-b-2 -mb-px transition ${
    active
      ? 'border-primary text-card-foreground font-medium'
      : 'border-transparent text-muted-foreground hover:text-card-foreground'
  }`
const navClass =
  'cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition'
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <div class="flex flex-wrap items-center gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-border">
      <h1 class="text-base font-semibold text-card-foreground mr-2">
        {{ t('planning.calendar.title') }}
      </h1>
      <nav class="flex gap-1 border-b border-border" :aria-label="t('planning.calendar.rows')">
        <button type="button" :class="tabClass(kind === 'vehicles')" @click="kind = 'vehicles'">
          {{ t('planning.calendar.vehicles') }}
        </button>
        <button type="button" :class="tabClass(kind === 'drivers')" @click="kind = 'drivers'">
          {{ t('planning.calendar.drivers') }}
        </button>
      </nav>
      <div class="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          :class="navClass"
          :aria-label="t('planning.calendar.previous')"
          @click="monday = addDays(monday, -7)"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button type="button" :class="navClass" @click="monday = weekStart(today)">
          {{ t('planning.calendar.thisWeek') }}
        </button>
        <button
          type="button"
          :class="navClass"
          :aria-label="t('planning.calendar.next')"
          @click="monday = addDays(monday, 7)"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
        <span class="text-sm font-medium text-card-foreground ml-2">{{ weekLabel }}</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-4 px-4 sm:px-6 py-2 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-primary/70" />{{ t('planning.calendar.legend.planned') }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-destructive" />{{
          t('planning.calendar.legend.overlap')
        }}
      </span>
      <label class="inline-flex items-center gap-1.5 text-card-foreground">
        <input v-model="onlyBusy" type="checkbox" class="h-3.5 w-3.5 accent-primary" />
        {{ t('planning.calendar.onlyBusy') }}
      </label>
      <span v-if="overlapCount" class="ml-auto font-medium text-destructive">
        {{ t('planning.calendar.overlaps', overlapCount) }}
      </span>
    </div>

    <FormAlerts class="mx-4" :error="error" @clear:error="error = null" />
    <LoadingSpinner v-if="loading && !rows.length" :text="t('common.loading')" />

    <div v-else class="flex-1 min-h-0 overflow-auto px-4 sm:px-6 pb-6">
      <div class="min-w-[960px] border border-border rounded">
        <div class="grid grid-cols-[220px_1fr] sticky top-0 z-10 bg-muted text-xs font-semibold">
          <div class="px-3 py-2 border-r border-border text-muted-foreground">
            {{
              kind === 'vehicles' ? t('planning.calendar.vehicle') : t('planning.calendar.driver')
            }}
          </div>
          <div
            class="grid"
            :style="{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }"
          >
            <div
              v-for="column in columns"
              :key="column.key"
              class="px-2 py-2 border-l border-border first:border-l-0 text-left"
              :class="column.day === today ? 'text-primary' : 'text-muted-foreground'"
            >
              {{ column.label }}
            </div>
          </div>
        </div>
        <p v-if="!shownRows.length" class="px-3 py-6 text-sm text-muted-foreground">
          {{ t('planning.calendar.empty') }}
        </p>
        <div
          v-for="row in shownRows"
          :key="row.no"
          class="grid grid-cols-[220px_1fr] border-t border-border"
        >
          <div
            class="px-3 py-2 border-r border-border text-sm font-medium text-card-foreground truncate"
          >
            {{ row.label }}
          </div>
          <div class="relative h-11">
            <div
              class="absolute inset-0 grid pointer-events-none"
              :style="{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }"
            >
              <div
                v-for="column in columns"
                :key="column.key"
                class="border-l border-border first:border-l-0"
                :class="column.day === today ? 'bg-primary/5' : ''"
              />
            </div>
            <button
              v-for="bar in row.bars"
              :key="bar.key"
              type="button"
              class="absolute top-1.5 h-8 rounded px-1.5 text-left text-xs text-white truncate cursor-pointer shadow-sm hover:opacity-90"
              :class="overlaps.has(`${row.no}|${bar.key}`) ? 'bg-destructive' : 'bg-primary/70'"
              :style="position(bar)"
              :title="barTitle(bar)"
              @click="open(bar)"
            >
              {{ bar.orderNos[0] ?? bar.tripNo }} · {{ bar.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
