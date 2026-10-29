<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { GraduationCap } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { driverService } from '../services/driverService'
import type { DriverScoreApi } from '../types/driver.types'
import type { FamilyScore, ScoreTerm } from '../domain/driverScore'

const props = defineProps<{ driverNo: string }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const { canInsert: canProposeTraining } = usePermissions('TRAINING')

const detail = ref<DriverScoreApi | null>(null)
const error = ref<string | null>(null)
const working = ref(false)

async function load() {
  error.value = null
  try {
    detail.value = await driverService.score(props.driverNo)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.drivers.score.loadError'))
  }
}

watch(() => props.driverNo, load, { immediate: true })

async function proposeTraining() {
  working.value = true
  error.value = null
  try {
    detail.value = await driverService.proposeTraining(props.driverNo)
    emit('changed')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.drivers.score.actionError'))
  } finally {
    working.value = false
  }
}

const deltaText = computed(() => {
  const delta = detail.value?.delta ?? 0
  if (delta === 0) return t('fleet.drivers.score.stable')
  return t('fleet.drivers.score.delta', { delta: delta > 0 ? `+${delta}` : String(delta) })
})

/** mark = min(cap, max(0, 100 - sum of count x points)), written out with its figures. */
function formulaOf(family: FamilyScore): string {
  const terms = family.terms.map((term) => `${term.count} × ${term.points}`)
  const lost = terms.length ? ` - (${terms.join(' + ')})` : ''
  const cap = family.cap !== null ? t('fleet.drivers.score.capped', { cap: family.cap }) : ''
  return `100${lost}${cap} = ${family.mark}`
}

function sourceLabel(term: ScoreTerm): string {
  const source = t(`fleet.settings.scoreSource.${term.source}`)
  return term.severity
    ? `${source} (${t(`fleet.drivers.score.severity.${term.severity}`)})`
    : source
}

const overallFormula = computed(() => {
  if (!detail.value) return ''
  const parts = detail.value.families.map(
    (family) => `${family.mark} × ${Math.round(family.weightPct)} %`
  )
  return `${parts.join(' + ')} = ${detail.value.score}`
})

const barTone = (mark: number) =>
  mark >= 80 ? 'bg-success' : mark >= 60 ? 'bg-warning' : 'bg-destructive'
</script>

<template>
  <div class="xl:col-span-2 min-w-0 space-y-4">
    <FormAlerts :error="error" @clear:error="error = null" />
    <template v-if="detail">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-3xl font-semibold text-card-foreground">
            {{ detail.score }}<span class="text-base text-muted-foreground">/100</span>
          </p>
          <p class="text-xs text-muted-foreground">
            {{ deltaText }} ·
            {{ t('fleet.drivers.score.rank', { rank: detail.rank, count: detail.driverCount }) }}
          </p>
        </div>
        <div class="text-right space-y-1">
          <p
            class="text-sm"
            :class="detail.belowThreshold ? 'text-destructive' : 'text-muted-foreground'"
          >
            {{
              t(
                detail.belowThreshold
                  ? 'fleet.drivers.score.belowThreshold'
                  : 'fleet.drivers.score.aboveThreshold',
                { threshold: detail.threshold }
              )
            }}
          </p>
          <RouterLink
            v-if="detail.trainingNo"
            :to="{ path: '/fleet/trainings', query: { no: detail.trainingNo, cardMode: 'view' } }"
            class="text-sm text-primary hover:underline"
          >
            {{ t('fleet.drivers.score.trainingPending', { no: detail.trainingNo }) }}
          </RouterLink>
          <button
            v-else-if="detail.belowThreshold && canProposeTraining"
            type="button"
            class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="working"
            @click="proposeTraining"
          >
            <GraduationCap class="w-5 h-5 text-primary" />
            {{ t('fleet.drivers.score.proposeTraining') }}
          </button>
        </div>
      </div>

      <ul class="space-y-2">
        <li v-for="family in detail.families" :key="family.family" class="text-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-card-foreground">
              {{ family.label }}
              <span class="text-xs text-muted-foreground">
                · {{ t('fleet.drivers.score.weight', { weight: Math.round(family.weightPct) }) }}
              </span>
            </span>
            <span class="text-card-foreground font-medium">{{ family.mark }}</span>
          </div>
          <div class="h-1.5 rounded bg-muted overflow-hidden">
            <div
              class="h-full rounded"
              :class="barTone(family.mark)"
              :style="{ width: `${family.mark}%` }"
            />
          </div>
          <p class="text-xs text-muted-foreground" data-testid="score-formula">
            {{ t('fleet.drivers.score.formula', { formula: formulaOf(family) }) }}
          </p>
          <ul
            v-if="family.terms.length || family.cap !== null"
            class="text-xs text-muted-foreground"
          >
            <li v-for="term in family.terms" :key="`${term.source}-${term.severity}`">
              {{
                t('fleet.drivers.score.term', {
                  source: sourceLabel(term),
                  count: term.count,
                  points: term.points
                })
              }}
            </li>
            <li v-if="family.cap !== null">
              {{ t('fleet.drivers.score.cap', { cap: family.cap }) }}
            </li>
          </ul>
        </li>
      </ul>
      <p class="text-xs text-muted-foreground">
        {{ t('fleet.drivers.score.overallFormula', { formula: overallFormula }) }}
      </p>
    </template>
  </div>
</template>
