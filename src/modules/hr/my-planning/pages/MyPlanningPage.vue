<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, Clock, Coffee } from '@lucide/vue'
import { addDays, todayIso } from '@/utils/date'
import { formatDate, formatMinutes, formatWeekday } from '@/utils/format'
import { useMyPlanningStore } from '../stores/myPlanningStore'

const { t } = useI18n()
const store = useMyPlanningStore()
const today = todayIso()

const weekLabel = computed(() => {
  const planning = store.planning
  if (!planning) return ''
  return t('hr.myPlanning.week', {
    from: formatDate(planning.weekStart),
    to: formatDate(addDays(planning.weekStart, 6))
  })
})

const weeklyMinutes = computed(() =>
  (store.planning?.days ?? []).reduce((total, day) => total + (day.leave ? 0 : day.minutes), 0)
)

onMounted(() => void store.fetchWeek())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">{{ t('hr.myPlanning.title') }}</h1>
        <p class="text-sm text-muted-foreground">
          {{ store.planning?.employeeName }} · {{ weekLabel }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="p-2 border border-border rounded hover:bg-accent transition"
          :title="t('hr.myPlanning.previousWeek')"
          :disabled="store.loading"
          @click="store.shiftWeek(-1)"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
          :disabled="store.loading"
          @click="store.fetchWeek()"
        >
          {{ t('hr.myPlanning.thisWeek') }}
        </button>
        <button
          type="button"
          class="p-2 border border-border rounded hover:bg-accent transition"
          :title="t('hr.myPlanning.nextWeek')"
          :disabled="store.loading"
          @click="store.shiftWeek(1)"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </header>

    <FormAlerts :error="store.error" />
    <LoadingSpinner v-if="store.loading && !store.planning" :text="t('common.loading')" />

    <template v-if="store.planning">
      <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
        <article
          v-for="day in store.planning.days"
          :key="day.date"
          class="bg-card border rounded p-3 flex flex-col gap-2 min-h-36"
          :class="day.date === today ? 'border-primary border-2' : 'border-border'"
        >
          <header>
            <p class="text-sm font-semibold capitalize text-card-foreground">
              {{ formatWeekday(day.dayOfWeek) }}
            </p>
            <p class="text-xs text-muted-foreground">{{ formatDate(day.date) }}</p>
          </header>

          <div v-if="day.leave" class="flex-1 flex flex-col gap-1">
            <LeaveRequestStatusPill class="self-start" :status="day.leave.status" />
            <RouterLink
              :to="{ path: '/hr/leave-requests', query: { no: day.leave.no } }"
              class="text-sm text-primary hover:underline"
            >
              {{ day.leave.leaveTypeName }}
            </RouterLink>
          </div>
          <p v-else-if="day.holiday" class="flex-1 text-sm font-medium text-primary">
            {{ day.holiday }}
          </p>
          <div v-else-if="day.working" class="flex-1 space-y-1 text-xs text-muted-foreground">
            <p class="flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5 shrink-0" /> {{ day.start }} → {{ day.end }}
            </p>
            <p v-if="day.hasBreak" class="flex items-center gap-1.5">
              <Coffee class="w-3.5 h-3.5 shrink-0" />
              {{ t('hr.myPlanning.break', { from: day.breakStart, to: day.breakEnd }) }}
            </p>
            <p class="text-sm font-semibold text-primary pt-1">{{ formatMinutes(day.minutes) }}</p>
          </div>
          <p v-else class="flex-1 text-sm text-muted-foreground">
            {{ t('hr.workingCalendar.dayOff') }}
          </p>
        </article>
      </section>

      <p class="text-sm text-muted-foreground">
        {{ t('hr.myPlanning.weeklyTotal', { total: formatMinutes(weeklyMinutes) }) }}
      </p>
    </template>
  </div>
</template>
