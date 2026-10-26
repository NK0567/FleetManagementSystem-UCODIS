<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CircleCheck,
  ClipboardCheck,
  ListChecks,
  LoaderCircle,
  TriangleAlert,
  Truck
} from '@lucide/vue'
import { blockingAnomalies, checkIssues, type CheckResult } from '@/modules/fleet/check-points'
import { nowIsoDateTime } from '@/utils/date'
import { useMySpaceStore } from '../stores/mySpaceStore'

type Answer = 'ok' | 'anomaly'

const { t } = useI18n()
const store = useMySpaceStore()

const takenAt = ref(nowIsoDateTime().slice(0, 16))
const results = ref<CheckResult[]>([])

function resetResults() {
  results.value = (store.tour?.checkPoints ?? []).map((point) => ({
    pointNo: point.no,
    label: point.label,
    blocking: point.blocking,
    result: null,
    comment: ''
  }))
  takenAt.value = nowIsoDateTime().slice(0, 16)
}

watch(() => store.tour?.tripNo, resetResults)

function set(pointNo: string, patch: Partial<Pick<CheckResult, 'result' | 'comment'>>) {
  results.value = results.value.map((point) =>
    point.pointNo === pointNo ? { ...point, ...patch } : point
  )
}

function markRemainingOk() {
  results.value = results.value.map((point) => (point.result ? point : { ...point, result: 'ok' }))
}

const answered = computed(() => results.value.filter((point) => point.result).length)
const issues = computed(() => checkIssues(results.value))
const blocking = computed(() => blockingAnomalies(results.value).length > 0)
const canSubmit = computed(() => !!takenAt.value && !issues.value.length && !store.saving)

const ANSWERS: { value: Answer; icon: typeof CircleCheck; active: string }[] = [
  { value: 'ok', icon: CircleCheck, active: 'border-success bg-success-bg text-success' },
  {
    value: 'anomaly',
    icon: TriangleAlert,
    active: 'border-destructive bg-destructive/10 text-destructive'
  }
]

const segmentClass = (point: CheckResult) => {
  if (point.result === 'ok') return 'bg-success'
  if (point.result === 'anomaly') return 'bg-destructive'
  return 'bg-muted'
}

async function submit() {
  if (!canSubmit.value) return
  const done = await store.saveChecklist({
    takenAt: takenAt.value,
    results: results.value.map(({ pointNo, result, comment }) => ({ pointNo, result, comment }))
  })
  if (done) resetResults()
}

onMounted(async () => {
  await store.fetchChecklist()
  resetResults()
})
</script>

<template>
  <div class="px-2 py-4 space-y-4 w-full max-w-3xl mx-auto">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('selfService.checklist.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('selfService.checklist.subtitle') }}</p>
    </header>

    <FormAlerts
      :error="store.error"
      :success="store.notice"
      @clear:error="store.clearError"
      @clear:success="store.clearNotice"
    />
    <LoadingSpinner v-if="store.loading && !store.tour" :text="t('common.loading')" />

    <section
      v-if="store.tourLoaded && !store.loading && !store.tour && !store.error"
      class="bg-card border border-border rounded p-6 flex flex-col items-center gap-2 text-center"
    >
      <ClipboardCheck class="w-8 h-8 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">{{ t('selfService.checklist.empty') }}</p>
    </section>

    <template v-if="store.tour && store.profile">
      <section class="bg-card border border-border rounded p-4 flex items-center gap-3">
        <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
          <Truck class="w-5 h-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-card-foreground">{{ store.tour.tripNo }}</p>
          <p class="text-xs text-muted-foreground">{{ store.tour.vehiclePlate }}</p>
        </div>
        <TripStatusPill :status="store.tour.status" />
      </section>

      <p
        v-if="!store.profile.mayDeclare"
        class="bg-info-bg text-info rounded px-3 py-2 text-sm flex items-start gap-2"
      >
        <ListChecks class="w-4 h-4 mt-0.5 shrink-0" />
        {{ t('selfService.checklist.readOnly') }}
      </p>

      <form v-else class="space-y-4" @submit.prevent="submit">
        <section class="bg-card border border-border rounded p-4 space-y-3">
          <BaseFormField field="takenAt" :label="t('selfService.checklist.takenAt')" required>
            <FormInput v-model="takenAt" type="datetime-local" class="h-11" :invalid="!takenAt" />
          </BaseFormField>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="font-medium text-card-foreground tabular-nums">
                {{
                  t('selfService.checklist.progress', {
                    done: answered,
                    total: results.length
                  })
                }}
              </span>
              <button
                v-if="answered < results.length"
                type="button"
                class="text-sm text-primary hover:underline"
                @click="markRemainingOk"
              >
                {{ t('selfService.checklist.allOk') }}
              </button>
            </div>
            <div class="flex gap-1" aria-hidden="true">
              <span
                v-for="point in results"
                :key="point.pointNo"
                class="h-2 flex-1 rounded-full transition"
                :class="segmentClass(point)"
              />
            </div>
          </div>
        </section>

        <section class="bg-card border border-border rounded divide-y divide-border">
          <div v-for="point in results" :key="point.pointNo" class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-medium text-card-foreground">{{ point.label }}</p>
              <StatusPill
                v-if="point.blocking"
                :label="t('fleet.checkPoints.results.blocking')"
                tone="danger"
              />
            </div>
            <div class="grid grid-cols-2 gap-2" role="group" :aria-label="point.label">
              <button
                v-for="answer in ANSWERS"
                :key="answer.value"
                type="button"
                class="h-11 inline-flex items-center justify-center gap-2 rounded border text-sm font-medium transition"
                :class="
                  point.result === answer.value
                    ? answer.active
                    : 'border-border text-muted-foreground hover:bg-accent'
                "
                :aria-pressed="point.result === answer.value"
                @click="set(point.pointNo, { result: answer.value })"
              >
                <component :is="answer.icon" class="w-5 h-5" />
                {{ t(`selfService.checklist.${answer.value}`) }}
              </button>
            </div>
            <FormInput
              :model-value="point.comment"
              :maxlength="200"
              :placeholder="
                point.result === 'anomaly'
                  ? t('selfService.checklist.describeAnomaly')
                  : t('selfService.checklist.comment')
              "
              :invalid="point.result === 'anomaly' && !point.comment.trim()"
              @update:model-value="set(point.pointNo, { comment: String($event ?? '') })"
            />
          </div>
        </section>

        <p
          v-if="blocking"
          class="bg-destructive/10 text-destructive rounded px-3 py-2 text-sm flex items-start gap-2"
        >
          <TriangleAlert class="w-4 h-4 mt-0.5 shrink-0" />
          {{ t('selfService.checklist.blockingAnomaly') }}
        </p>

        <div
          class="sticky bottom-0 -mx-2 px-2 py-3 space-y-2 bg-background border-t border-border sm:static sm:mx-0 sm:p-0 sm:bg-transparent sm:border-0 sm:flex sm:items-center sm:justify-end sm:gap-3 sm:space-y-0"
        >
          <p v-if="issues.length" class="text-xs text-muted-foreground text-center sm:text-right">
            {{ t(`selfService.checklist.issue.${issues[0]}`) }}
          </p>
          <button
            type="submit"
            class="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-2 px-4 rounded bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canSubmit"
          >
            <LoaderCircle v-if="store.saving" class="w-5 h-5 animate-spin" />
            <ClipboardCheck v-else class="w-5 h-5" />
            {{ t('selfService.checklist.submit') }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
