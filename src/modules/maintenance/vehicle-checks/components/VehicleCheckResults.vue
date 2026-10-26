<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHECK_RESULTS, type CheckResult } from '../domain/vehicleCheck'

/** The points to answer, in order, with their blocking flag. */
const props = defineProps<{
  points: { no: string; label: string; blocking: boolean }[]
  disabled?: boolean
}>()
const answers = defineModel<Record<string, CheckResult>>({ required: true })

const { t } = useI18n()

const allAnswered = computed(() => props.points.every((point) => answers.value[point.no]))

function answer(no: string, result: CheckResult) {
  answers.value = { ...answers.value, [no]: result }
}

function allOk() {
  answers.value = Object.fromEntries(props.points.map((point) => [point.no, 'ok' as const]))
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="!points.length" class="text-sm text-muted-foreground">
      {{ t('maintenance.vehicleChecks.results.noPoint') }}
    </p>
    <table v-else class="w-full text-sm border border-border rounded">
      <tbody>
        <tr
          v-for="point in points"
          :key="point.no"
          class="border-t border-border first:border-t-0"
          :class="answers[point.no] === 'anomaly' && point.blocking ? 'bg-destructive/5' : ''"
        >
          <td class="px-3 py-1.5">
            {{ point.label }}
            <span v-if="point.blocking" class="text-xs text-destructive">
              · {{ t('maintenance.vehicleChecks.results.blocking') }}
            </span>
          </td>
          <td class="px-3 py-1.5 whitespace-nowrap text-right">
            <label
              v-for="result in CHECK_RESULTS"
              :key="result"
              class="ml-3 inline-flex items-center gap-1"
            >
              <input
                type="radio"
                :name="point.no"
                :checked="answers[point.no] === result"
                :disabled="disabled"
                @change="answer(point.no, result)"
              />
              {{ t(`maintenance.vehicleChecks.results.${result}`) }}
            </label>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!disabled && points.length" class="flex items-center gap-3">
      <button
        type="button"
        class="px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
        @click="allOk"
      >
        {{ t('maintenance.vehicleChecks.results.allOk') }}
      </button>
      <span v-if="!allAnswered" class="text-xs text-muted-foreground">
        {{ t('maintenance.vehicleChecks.results.toAnswer') }}
      </span>
    </div>
  </div>
</template>
