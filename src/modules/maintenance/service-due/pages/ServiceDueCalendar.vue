<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { addDays, weekStart } from '@/modules/planning/calendar/domain/calendar'
import { todayIso } from '@/utils/date'
import { formatDate, formatNumber } from '@/utils/format'
import { serviceDueService } from '../services/serviceDueService'
import type { ServiceDueApi } from '../types/serviceDue.types'

/* Four colours, as asked on 7 November: red past due, yellow close, green later, grey unknown. */
type Tone = 'late' | 'soon' | 'ok' | 'unknown'

const WEEKS = 8
const { t } = useI18n()
const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<ServiceDueApi[]>([])
const monday = ref(weekStart(todayIso()))
const onlyIssues = ref(false)

const toneOf = (item: ServiceDueApi): Tone =>
  item.status === 'overdue' || item.status === 'blocking'
    ? 'late'
    : item.status === 'due_soon'
      ? 'soon'
      : item.status === 'upcoming'
        ? 'ok'
        : 'unknown'

const TONE_CLASS: Record<Tone, string> = {
  late: 'bg-destructive/15 text-destructive border-destructive/40',
  soon: 'bg-warning-bg text-warning border-warning/40',
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  unknown: 'bg-accent text-muted-foreground border-border'
}

const weeks = computed(() =>
  Array.from({ length: WEEKS }, (_, index) => {
    const from = addDays(monday.value, index * 7)
    return { key: from, from, to: addDays(from, 6) }
  })
)

/** Columns: late, the eight weeks, then what only a distance or a meter will tell. */
type Column = 'late' | 'later' | 'meter' | string

function columnOf(item: ServiceDueApi): Column {
  if (toneOf(item) === 'late') return 'late'
  if (item.nextDate) {
    const week = weeks.value.find((w) => item.nextDate! >= w.from && item.nextDate! <= w.to)
    return week ? week.key : item.nextDate < monday.value ? 'late' : 'later'
  }
  return 'meter'
}

/** Closest first: the smallest of the distance, hour and day margins left. */
const remaining = (item: ServiceDueApi) =>
  Math.min(
    item.kmRemaining ?? Infinity,
    item.hoursRemaining ?? Infinity,
    item.daysRemaining ?? Infinity
  )

const SHOWN = 3
const unknownCount = computed(() => items.value.filter((item) => toneOf(item) === 'unknown').length)

const rows = computed(() => {
  const byVehicle = new Map<string, { plate: string; cells: Map<Column, ServiceDueApi[]> }>()
  for (const item of items.value) {
    if (toneOf(item) === 'unknown') continue
    if (onlyIssues.value && toneOf(item) !== 'late' && toneOf(item) !== 'soon') continue
    const row = byVehicle.get(item.vehicleNo) ?? { plate: item.vehiclePlate, cells: new Map() }
    const key = columnOf(item)
    row.cells.set(key, [...(row.cells.get(key) ?? []), item])
    byVehicle.set(item.vehicleNo, row)
  }
  for (const row of byVehicle.values()) {
    for (const cell of row.cells.values()) cell.sort((a, b) => remaining(a) - remaining(b))
  }
  return [...byVehicle.entries()]
    .map(([no, row]) => ({ no, ...row }))
    .sort((a, b) => a.plate.localeCompare(b.plate))
})

function detail(item: ServiceDueApi): string {
  const parts: string[] = []
  if (item.nextDate) parts.push(formatDate(item.nextDate))
  if (item.kmRemaining !== null) {
    parts.push(
      item.kmRemaining < 0
        ? t('maintenance.serviceDue.calendar.kmLate', { km: formatNumber(-item.kmRemaining) })
        : t('maintenance.serviceDue.calendar.kmLeft', { km: formatNumber(item.kmRemaining) })
    )
  }
  if (item.hoursRemaining !== null) {
    parts.push(
      t('maintenance.serviceDue.calendar.hoursLeft', { hours: formatNumber(item.hoursRemaining) })
    )
  }
  return parts.join(' · ')
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const page = await serviceDueService.getAll({ page: 1, pageSize: 500, sortBy: 'vehiclePlate' })
    items.value = page.data.items
  } catch (e) {
    error.value = apiErrorMessage(e, t('maintenance.serviceDue.calendar.loadError'))
  } finally {
    loading.value = false
  }
}

onMounted(load)

const legend: { tone: Tone; key: string }[] = [
  { tone: 'late', key: 'late' },
  { tone: 'soon', key: 'soon' },
  { tone: 'ok', key: 'ok' }
]
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
      <h2 class="text-base font-semibold text-card-foreground">
        {{ t('maintenance.serviceDue.calendar.title') }}
      </h2>
      <div class="flex items-center gap-2 ml-auto">
        <button
          type="button"
          class="px-2 py-1.5 border border-border rounded hover:bg-accent"
          :aria-label="t('common.previous')"
          @click="monday = addDays(monday, -7 * WEEKS)"
        >
          <ChevronLeft class="size-4" />
        </button>
        <button
          type="button"
          class="px-3 py-1.5 border border-border rounded text-sm hover:bg-accent"
          @click="monday = weekStart(todayIso())"
        >
          {{ t('maintenance.serviceDue.calendar.today') }}
        </button>
        <button
          type="button"
          class="px-2 py-1.5 border border-border rounded hover:bg-accent"
          :aria-label="t('common.next')"
          @click="monday = addDays(monday, 7 * WEEKS)"
        >
          <ChevronRight class="size-4" />
        </button>
        <span class="text-sm text-muted-foreground">
          {{
            t('maintenance.serviceDue.calendar.range', {
              from: formatDate(weeks[0]!.from),
              to: formatDate(weeks[WEEKS - 1]!.to)
            })
          }}
        </span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-4 px-4 py-2 text-xs text-muted-foreground">
      <span v-for="entry in legend" :key="entry.key" class="inline-flex items-center gap-1.5">
        <span class="inline-block size-3 rounded border" :class="TONE_CLASS[entry.tone]" />
        {{ t(`maintenance.serviceDue.calendar.legend.${entry.key}`) }}
      </span>
      <label class="inline-flex items-center gap-1.5 ml-auto cursor-pointer">
        <input v-model="onlyIssues" type="checkbox" />
        {{ t('maintenance.serviceDue.calendar.onlyIssues') }}
      </label>
    </div>

    <p v-if="unknownCount" class="mx-4 mb-1 text-xs text-muted-foreground">
      {{ t('maintenance.serviceDue.calendar.unknown', { count: unknownCount }) }}
    </p>
    <p v-if="error" class="mx-4 text-sm text-destructive">{{ error }}</p>
    <p v-else-if="loading" class="mx-4 text-sm text-muted-foreground">
      {{ t('maintenance.serviceDue.loadingList') }}
    </p>
    <p v-else-if="!rows.length" class="mx-4 text-sm text-muted-foreground">
      {{ t('maintenance.serviceDue.calendar.empty') }}
    </p>

    <div v-if="rows.length" class="flex-1 overflow-auto px-4 pb-4">
      <table class="w-full border-collapse text-xs">
        <thead class="sticky top-0 bg-muted z-10">
          <tr>
            <th class="border border-border p-2 text-left min-w-28">
              {{ t('maintenance.serviceDue.col.vehiclePlate') }}
            </th>
            <th class="border border-border p-2 text-left min-w-40 text-destructive">
              {{ t('maintenance.serviceDue.calendar.late') }}
            </th>
            <th class="border border-border p-2 text-left min-w-52">
              {{ t('maintenance.serviceDue.calendar.meter') }}
            </th>
            <th
              v-for="week in weeks"
              :key="week.key"
              class="border border-border p-2 text-left min-w-36"
            >
              {{ formatDate(week.from) }}
            </th>
            <th class="border border-border p-2 text-left min-w-40">
              {{ t('maintenance.serviceDue.calendar.later') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.no" class="align-top">
            <td class="border border-border p-2 font-medium text-card-foreground">
              {{ row.plate }}
            </td>
            <td
              v-for="column in ['late', 'meter', ...weeks.map((w) => w.key), 'later']"
              :key="column"
              class="border border-border p-1 space-y-0.5"
            >
              <div
                v-for="item in (row.cells.get(column) ?? []).slice(0, SHOWN)"
                :key="item.no"
                class="rounded border px-1.5 py-0.5 text-[11px]"
                :class="TONE_CLASS[toneOf(item)]"
              >
                <div class="font-medium leading-tight">{{ item.operationLabel }}</div>
                <div class="opacity-80 leading-tight">{{ detail(item) }}</div>
              </div>
              <div
                v-if="(row.cells.get(column) ?? []).length > SHOWN"
                class="px-1 text-[11px] text-muted-foreground"
              >
                {{
                  t('maintenance.serviceDue.calendar.more', {
                    count: (row.cells.get(column) ?? []).length - SHOWN
                  })
                }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
