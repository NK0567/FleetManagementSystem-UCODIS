<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDays, CalendarPlus, CalendarX } from '@lucide/vue'
import { formatDate, formatNumber } from '@/utils/format'
import { dayPluralChoice } from '../domain/myspace'
import MyLeaveBalances from '../components/MyLeaveBalances.vue'
import { useMySpaceStore } from '../stores/mySpaceStore'

const { t } = useI18n()
const store = useMySpaceStore()

const dialogOpen = ref(false)
const form = reactive({ leaveTypeNo: '', startDate: '', endDate: '', reason: '' })

const balanceOf = (leaveTypeNo: string) =>
  store.profile?.balances.find((balance) => balance.leaveTypeNo === leaveTypeNo)

function balanceLabel(leaveTypeNo: string) {
  const days = balanceOf(leaveTypeNo)?.remainingDays ?? 0
  const count = formatNumber(days, Number.isInteger(days) ? 0 : 1)
  return `${count} ${t('selfService.profile.daysUnit', dayPluralChoice(days))}`
}

const endBeforeStart = computed(
  () => !!form.startDate && !!form.endDate && form.endDate < form.startDate
)
const canSend = computed(
  () =>
    !!form.leaveTypeNo &&
    !!form.startDate &&
    !!form.endDate &&
    !!form.reason.trim() &&
    !endBeforeStart.value
)

function openDialog() {
  Object.assign(form, {
    leaveTypeNo: store.profile?.leaveTypes[0]?.no ?? '',
    startDate: '',
    endDate: '',
    reason: ''
  })
  store.clearError()
  store.clearNotice()
  dialogOpen.value = true
}

async function send() {
  if (!canSend.value) return
  if (await store.requestAbsence({ ...form, reason: form.reason.trim() })) {
    dialogOpen.value = false
  }
}

onMounted(() => void store.fetchAbsences())
</script>

<template>
  <div class="px-2 py-4 space-y-4 w-full max-w-3xl mx-auto">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">
          {{ t('selfService.absences.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">{{ t('selfService.absences.subtitle') }}</p>
      </div>
      <button
        v-if="store.profile"
        type="button"
        class="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition"
        @click="openDialog"
      >
        <CalendarPlus class="w-5 h-5" />
        {{ t('selfService.absences.new') }}
      </button>
    </header>

    <FormAlerts
      v-if="!dialogOpen"
      :error="store.error"
      :success="store.notice"
      @clear:error="store.clearError"
      @clear:success="store.clearNotice"
    />
    <LoadingSpinner v-if="store.loading && !store.profile" :text="t('common.loading')" />

    <template v-if="store.profile">
      <MyLeaveBalances :balances="store.profile.balances" />

      <section class="bg-card border border-border rounded">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('selfService.absences.requests') }}
        </h2>
        <div v-if="!store.absences.length" class="p-6 flex flex-col items-center gap-2 text-center">
          <CalendarX class="w-8 h-8 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">{{ t('selfService.absences.empty') }}</p>
        </div>
        <ul v-else class="divide-y divide-border">
          <li v-for="request in store.absences" :key="request.no" class="px-4 py-3 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex items-center gap-2">
                <CalendarDays class="w-5 h-5 text-primary shrink-0" />
                <p class="text-sm font-medium text-card-foreground truncate">
                  {{ request.leaveTypeName }}
                </p>
              </div>
              <LeaveRequestStatusPill :status="request.status" />
            </div>
            <p class="text-sm text-card-foreground">
              {{
                t('selfService.absences.period', {
                  from: formatDate(request.startDate),
                  to: formatDate(request.endDate)
                })
              }}
              <span class="text-muted-foreground tabular-nums">
                · {{ t('hr.leaveRequests.form.dayCount', request.days) }}
              </span>
            </p>
            <p v-if="request.reason" class="text-xs text-muted-foreground">
              {{ request.reason }}
            </p>
            <p v-if="request.decisionComment" class="text-xs text-muted-foreground">
              {{ t('selfService.absences.decision', { comment: request.decisionComment }) }}
            </p>
          </li>
        </ul>
      </section>

      <div class="sticky bottom-0 -mx-2 px-2 py-3 bg-background border-t border-border sm:hidden">
        <button
          type="button"
          class="w-full h-11 inline-flex items-center justify-center gap-2 px-4 rounded bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition"
          @click="openDialog"
        >
          <CalendarPlus class="w-5 h-5" />
          {{ t('selfService.absences.new') }}
        </button>
      </div>
    </template>

    <ConfirmDialog
      :open="dialogOpen"
      :title="t('selfService.absences.new')"
      :confirm-label="t('selfService.absences.submit')"
      :confirm-disabled="!canSend"
      :loading="store.saving"
      panel-class="max-w-md max-h-full overflow-y-auto"
      @confirm="send"
      @cancel="dialogOpen = false"
    >
      <div v-if="store.profile" class="space-y-4">
        <FormAlerts :error="store.error" @clear:error="store.clearError" />

        <BaseFormField field="leaveTypeNo" :label="t('selfService.absences.type')" required>
          <div class="grid grid-cols-1 gap-2" role="radiogroup">
            <button
              v-for="type in store.profile.leaveTypes"
              :key="type.no"
              type="button"
              role="radio"
              class="min-h-11 px-3 py-2 rounded border text-left text-sm flex items-center justify-between gap-2 transition"
              :class="
                form.leaveTypeNo === type.no
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-card-foreground hover:bg-accent'
              "
              :aria-checked="form.leaveTypeNo === type.no"
              @click="form.leaveTypeNo = type.no"
            >
              <span class="truncate">{{ type.name }}</span>
              <span
                v-if="balanceOf(type.no)"
                class="text-xs tabular-nums text-muted-foreground shrink-0"
              >
                {{ balanceLabel(type.no) }}
              </span>
            </button>
          </div>
        </BaseFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseFormField field="startDate" :label="t('selfService.absences.from')" required>
            <DateFormInput v-model="form.startDate" class="h-11" />
          </BaseFormField>
          <BaseFormField field="endDate" :label="t('selfService.absences.to')" required>
            <DateFormInput
              v-model="form.endDate"
              class="h-11"
              :min="form.startDate || undefined"
              :invalid="endBeforeStart"
            />
          </BaseFormField>
        </div>
        <p v-if="endBeforeStart" class="text-xs text-destructive">
          {{ t('hr.leaveRequests.form.endBeforeStart') }}
        </p>

        <BaseFormField field="reason" :label="t('selfService.absences.reason')" required>
          <FormTextarea v-model="form.reason" :rows="3" :maxlength="300" />
        </BaseFormField>
      </div>
    </ConfirmDialog>
  </div>
</template>
