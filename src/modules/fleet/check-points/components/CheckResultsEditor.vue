<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { CHECK_RESULTS, type CheckResult, type CheckResultValue } from '../domain/checkResult'

const props = withDefaults(
  defineProps<{
    results: CheckResult[]
    disabled?: boolean
    /** Driver checks are passed or failed: "not applicable" makes no sense there. */
    allowNotApplicable?: boolean
  }>(),
  { disabled: false, allowNotApplicable: true }
)
const emit = defineEmits<{ 'update:results': [results: CheckResult[]] }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()

const choices = () => CHECK_RESULTS.filter((value) => props.allowNotApplicable || value !== 'na')

function set(pointNo: string, patch: Partial<Pick<CheckResult, 'result' | 'comment'>>) {
  emit(
    'update:results',
    props.results.map((point) => (point.pointNo === pointNo ? { ...point, ...patch } : point))
  )
}

const TONES: Record<CheckResultValue, string> = {
  ok: 'border-success text-success bg-success/10',
  anomaly: 'border-destructive text-destructive bg-destructive/10',
  na: 'border-border text-muted-foreground bg-muted/40'
}
</script>

<template>
  <table class="w-full text-sm border border-border rounded">
    <thead>
      <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
        <th class="px-3 py-2 font-semibold">{{ t('fleet.checkPoints.results.point') }}</th>
        <th class="px-3 py-2 font-semibold">{{ t('fleet.checkPoints.results.result') }}</th>
        <th class="px-3 py-2 font-semibold w-1/3">{{ t('fleet.checkPoints.results.comment') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="point in results" :key="point.pointNo" class="border-t border-border align-top">
        <td class="px-3 py-2">
          <span class="text-card-foreground">{{ point.label }}</span>
          <span v-if="point.blocking" class="ml-2 text-xs text-destructive">
            {{ t('fleet.checkPoints.results.blocking') }}
          </span>
        </td>
        <td class="px-3 py-2">
          <div class="flex flex-wrap gap-1">
            <button
              v-for="value in choices()"
              :key="value"
              type="button"
              class="px-2 py-0.5 text-xs rounded border transition disabled:cursor-default"
              :class="point.result === value ? TONES[value] : 'border-border text-muted-foreground'"
              :disabled="disabled"
              :aria-pressed="point.result === value"
              @click="set(point.pointNo, { result: value })"
            >
              {{ optionsStore.getOptionLabel('checkResult', value) }}
            </button>
          </div>
        </td>
        <td class="px-3 py-2">
          <FormInput
            v-if="!disabled"
            :model-value="point.comment"
            :maxlength="200"
            :invalid="point.result === 'anomaly' && !point.comment.trim()"
            @update:model-value="set(point.pointNo, { comment: String($event ?? '') })"
          />
          <span v-else class="text-card-foreground">{{ point.comment }}</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>
