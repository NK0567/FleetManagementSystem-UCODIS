<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarClock, ClipboardList, Gauge, Hourglass } from '@lucide/vue'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDate, formatNumber } from '@/utils/format'
import { useWorkshopLoadStore } from '../stores/workshopLoadStore'
import type { WorkshopJob } from '../types/workshopLoad.types'

const { t } = useI18n()
const store = useWorkshopLoadStore()
const optionsStore = useOptionsStore()

/** Past these shares of a working week the workshop is tight, then overbooked. */
const TIGHT_RATE = 90
const FULL_RATE = 100

const occupancyTone = computed(() => {
  const rate = store.load?.occupancyRate ?? 0
  if (rate > FULL_RATE) return 'text-destructive'
  return rate > TIGHT_RATE ? 'text-warning' : 'text-card-foreground'
})

const kpis = computed(() => {
  const load = store.load
  if (!load) return []
  return [
    {
      key: 'load',
      icon: Hourglass,
      value: `${formatNumber(load.loadHours, 1)} h`,
      label: t('maintenance.workshopLoad.kpi.load'),
      sub: t('maintenance.workshopLoad.kpi.loadSub', {
        hours: formatNumber(load.capacityHoursPerDay)
      })
    },
    {
      key: 'occupancy',
      icon: Gauge,
      value: load.occupancyRate === null ? '-' : `${load.occupancyRate} %`,
      label: t('maintenance.workshopLoad.kpi.occupancy'),
      sub: t('maintenance.workshopLoad.kpi.occupancySub', { days: load.workingDaysPerWeek })
    },
    {
      key: 'days',
      icon: CalendarClock,
      value: load.daysToAbsorb ?? '-',
      label: t('maintenance.workshopLoad.kpi.days'),
      sub: t('maintenance.workshopLoad.kpi.daysSub')
    },
    {
      key: 'unplanned',
      icon: ClipboardList,
      value: load.unplannedCount,
      label: t('maintenance.workshopLoad.kpi.unplanned'),
      sub: t('maintenance.workshopLoad.kpi.unplannedSub')
    }
  ]
})

const card = (job: WorkshopJob) => ({
  path: '/maintenance/work-orders',
  query: { no: job.no, cardMode: 'view' }
})
const severity = (job: WorkshopJob) =>
  optionsStore.getOptionLabel('workOrderSeverity', job.severity)

onMounted(() => void store.fetchLoad())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('maintenance.workshopLoad.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('maintenance.workshopLoad.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" />
    <LoadingSpinner v-if="store.loading && !store.load" :text="t('common.loading')" />

    <template v-if="store.load">
      <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="bg-card border border-border rounded p-4 flex items-start gap-3"
        >
          <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
            <component :is="kpi.icon" class="w-5 h-5" />
          </span>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p
              class="text-2xl font-semibold tabular-nums"
              :class="kpi.key === 'occupancy' ? occupancyTone : 'text-card-foreground'"
            >
              {{ kpi.value }}
            </p>
            <p class="text-xs text-muted-foreground truncate">{{ kpi.sub }}</p>
          </div>
        </div>
      </section>

      <section class="bg-card border border-border rounded">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('maintenance.workshopLoad.byTechnician') }}
        </h2>
        <p v-if="!store.load.technicians.length" class="p-4 text-sm text-muted-foreground">
          {{ t('maintenance.workshopLoad.noTechnician') }}
        </p>
        <div
          v-for="technician in store.load.technicians"
          :key="technician.no"
          class="px-4 py-3 border-t border-border first:border-t-0"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="font-medium text-card-foreground">
              {{ technician.name }}
              <span v-if="!technician.active" class="text-xs text-muted-foreground">
                · {{ t('maintenance.workshopLoad.inactive') }}
              </span>
            </p>
            <p class="text-sm tabular-nums text-muted-foreground">
              {{ formatNumber(technician.plannedHours, 1) }} h
            </p>
          </div>
          <p v-if="!technician.jobs.length" class="text-xs text-muted-foreground">
            {{ t('maintenance.workshopLoad.free') }}
          </p>
          <ul v-else class="mt-1 space-y-1 text-sm">
            <li v-for="job in technician.jobs" :key="job.no" class="flex flex-wrap gap-x-2">
              <RouterLink :to="card(job)" class="text-primary hover:underline">
                {{ job.no }}
              </RouterLink>
              <span>{{ job.vehiclePlate }}</span>
              <span class="text-muted-foreground">{{ formatDate(job.plannedDate) }}</span>
              <span class="text-muted-foreground">{{ severity(job) }}</span>
              <span class="tabular-nums text-muted-foreground">
                {{
                  t('maintenance.workshopLoad.remaining', {
                    hours: formatNumber(job.remainingHours, 1)
                  })
                }}
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section class="bg-card border border-border rounded">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('maintenance.workshopLoad.unplanned') }}
        </h2>
        <p v-if="!store.load.unplanned.length" class="p-4 text-sm text-muted-foreground">
          {{ t('maintenance.workshopLoad.noUnplanned') }}
        </p>
        <ul v-else class="divide-y divide-border text-sm">
          <li
            v-for="job in store.load.unplanned"
            :key="job.no"
            class="px-4 py-2 flex flex-wrap gap-x-3"
          >
            <RouterLink :to="card(job)" class="text-primary hover:underline">{{
              job.no
            }}</RouterLink>
            <span>{{ job.vehiclePlate }}</span>
            <span class="text-muted-foreground">{{ severity(job) }}</span>
            <span class="text-muted-foreground truncate">{{ job.symptom }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
