<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, PenLine, X } from '@lucide/vue'
import { usePermissions } from '@/composables/usePermissions'
import { useUnsavedChangesRouteGuard } from '@/composables/useUnsavedChangesRouteGuard'
import { formatDateTime, formatMinutes, formatWeekday } from '@/utils/format'
import {
  dailyWorkingMinutes,
  weeklyWorkingMinutes,
  workingDayIssues,
  type WorkingDay
} from '../domain/workingDays'
import { useWorkingCalendarStore } from '../stores/workingCalendarStore'

const { t } = useI18n()
const store = useWorkingCalendarStore()
const { canUpdate } = usePermissions('WORKINGCALENDAR')

/** Edits apply to a copy; the stored calendar only changes when the server accepts the week. */
const draft = ref<WorkingDay[] | null>(null)
const isEditing = computed(() => draft.value !== null)
const days = computed(() => draft.value ?? store.calendar?.days ?? [])

const isDirty = computed(
  () => !!draft.value && JSON.stringify(draft.value) !== JSON.stringify(store.calendar?.days)
)
useUnsavedChangesRouteGuard(isDirty)

const issuesByDay = computed(
  () => new Map(days.value.map((day) => [day.dayOfWeek, workingDayIssues(day)]))
)
const hasIssues = computed(() => [...issuesByDay.value.values()].some((issues) => issues.length))
const weeklyMinutes = computed(() => weeklyWorkingMinutes(days.value))

function startEditing() {
  store.saveError = null
  draft.value = (store.calendar?.days ?? []).map((day) => ({ ...day }))
}

function cancelEditing() {
  draft.value = null
  store.saveError = null
}

async function save() {
  if (!draft.value || hasIssues.value) return
  if (await store.saveDays(draft.value)) draft.value = null
}

onMounted(() => void store.fetchCalendar())
</script>

<template>
  <div class="px-2 py-4 space-y-4 max-w-5xl">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">
          {{ t('hr.workingCalendar.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">{{ t('hr.workingCalendar.subtitle') }}</p>
        <p v-if="store.calendar" class="text-xs text-muted-foreground mt-1">
          {{
            t('hr.workingCalendar.lastModified', {
              date: formatDateTime(store.calendar.modifiedAt),
              user: store.calendar.modifiedBy
            })
          }}
        </p>
      </div>
      <div v-if="canUpdate && store.calendar" class="flex items-center gap-2 shrink-0">
        <template v-if="isEditing">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
            :disabled="store.saving"
            @click="cancelEditing"
          >
            <X class="w-4 h-4" /> {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="store.saving || !isDirty || hasIssues"
            @click="save"
          >
            <Check class="w-4 h-4" /> {{ t('common.save') }}
          </button>
        </template>
        <button
          v-else
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
          @click="startEditing"
        >
          <PenLine class="w-4 h-4" /> {{ t('common.edit') }}
        </button>
      </div>
    </header>

    <FormAlerts :error="store.saveError ?? store.error" @clear:error="store.saveError = null" />

    <LoadingSpinner v-if="store.loading" :text="t('common.loading')" />

    <div v-else-if="store.calendar" class="bg-card border border-border rounded overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th class="px-4 py-2 font-semibold">{{ t('hr.workingCalendar.col.day') }}</th>
            <th class="px-4 py-2 font-semibold">{{ t('hr.workingCalendar.col.working') }}</th>
            <th class="px-4 py-2 font-semibold">{{ t('hr.workingCalendar.col.hours') }}</th>
            <th class="px-4 py-2 font-semibold">{{ t('hr.workingCalendar.col.break') }}</th>
            <th class="px-4 py-2 font-semibold text-right">
              {{ t('hr.workingCalendar.col.duration') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="day in days"
            :key="day.dayOfWeek"
            class="border-b border-border/60 align-top"
            :class="day.working ? '' : 'bg-muted/30'"
          >
            <td class="px-4 py-3 font-medium capitalize text-card-foreground">
              {{ formatWeekday(day.dayOfWeek) }}
            </td>
            <td class="px-4 py-3">
              <ToggleSwitch v-model="day.working" :disabled="!isEditing" />
            </td>
            <td class="px-4 py-3">
              <div v-if="day.working" class="flex items-center gap-2">
                <FormInput v-model="day.start" type="time" class="w-28" :disabled="!isEditing" />
                <span class="text-muted-foreground">–</span>
                <FormInput v-model="day.end" type="time" class="w-28" :disabled="!isEditing" />
              </div>
              <span v-else class="text-muted-foreground">{{ t('hr.workingCalendar.dayOff') }}</span>
            </td>
            <td class="px-4 py-3">
              <div v-if="day.working" class="flex items-center gap-2">
                <ToggleSwitch v-model="day.hasBreak" :disabled="!isEditing" />
                <template v-if="day.hasBreak">
                  <FormInput
                    v-model="day.breakStart"
                    type="time"
                    class="w-28"
                    :disabled="!isEditing"
                  />
                  <span class="text-muted-foreground">–</span>
                  <FormInput
                    v-model="day.breakEnd"
                    type="time"
                    class="w-28"
                    :disabled="!isEditing"
                  />
                </template>
              </div>
              <p
                v-for="issue in issuesByDay.get(day.dayOfWeek) ?? []"
                :key="issue"
                class="text-xs text-destructive mt-1"
              >
                {{ t(`hr.workingCalendar.issue.${issue}`) }}
              </p>
            </td>
            <td class="px-4 py-3 text-right tabular-nums">
              {{ formatMinutes(dailyWorkingMinutes(day)) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="bg-muted/40 font-semibold">
            <td class="px-4 py-2" colspan="4">{{ t('hr.workingCalendar.weeklyTotal') }}</td>
            <td class="px-4 py-2 text-right tabular-nums">{{ formatMinutes(weeklyMinutes) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
