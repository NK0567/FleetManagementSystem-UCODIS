<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { INDICATOR_SPECS, indicatorIssues, type IndicatorSetting } from '../domain/indicators'
import { fleetSettingsService } from '../services/fleetSettingsService'

/** Code, label and target of each indicator, with their definitions in an appendix. */
const props = defineProps<{ indicators: IndicatorSetting[]; canEdit: boolean }>()
const emit = defineEmits<{
  saved: [indicators: IndicatorSetting[]]
  'update:dirty': [dirty: boolean]
}>()

const { t } = useI18n()
const open = ref(false)
const draft = ref<IndicatorSetting[]>([])
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function reset() {
  draft.value = props.indicators.map((indicator) => ({ ...indicator }))
}

watch(() => props.indicators, reset, { immediate: true })

const normalized = (items: readonly IndicatorSetting[]) =>
  items.map((item) => ({
    ...item,
    target: item.target === null || (item.target as unknown) === '' ? null : Number(item.target)
  }))
const dirty = computed(
  () => JSON.stringify(normalized(draft.value)) !== JSON.stringify(normalized(props.indicators))
)
watch(dirty, (value) => emit('update:dirty', value))
const issues = computed(() => indicatorIssues(normalized(draft.value)))

async function save() {
  saving.value = true
  error.value = null
  success.value = null
  try {
    const saved = await fleetSettingsService.saveIndicators(normalized(draft.value))
    emit('saved', saved)
    success.value = t('fleet.settings.indicators.saved')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.settings.saveError'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormSection v-model:open="open" :title="t('fleet.settings.indicators.title')" :summary="[]">
    <div class="xl:col-span-2 min-w-0 space-y-3 text-sm" data-testid="indicators">
      <p class="text-muted-foreground">{{ t('fleet.settings.indicators.hint') }}</p>
      <FormAlerts
        :error="error"
        :success="success"
        @clear:error="error = null"
        @clear:success="success = null"
      />
      <table class="w-full text-sm border border-border rounded">
        <thead class="bg-muted/50 text-left">
          <tr>
            <th class="px-3 py-2 font-medium">{{ t('fleet.settings.indicators.code') }}</th>
            <th class="px-3 py-2 font-medium">{{ t('fleet.settings.indicators.label') }}</th>
            <th class="px-3 py-2 font-medium">{{ t('fleet.settings.indicators.target') }}</th>
            <th class="px-3 py-2 font-medium">{{ t('fleet.settings.indicators.direction') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="indicator in draft" :key="indicator.key">
            <td class="px-3 py-1.5 w-36">
              <FormInput v-model="indicator.code" :maxlength="12" :disabled="!canEdit" />
            </td>
            <td class="px-3 py-1.5">
              <FormInput v-model="indicator.label" :maxlength="80" :disabled="!canEdit" />
            </td>
            <td class="px-3 py-1.5 w-48">
              <div class="flex items-center gap-1.5">
                <FormInput
                  v-model="indicator.target"
                  type="number"
                  :min="INDICATOR_SPECS[indicator.key].min"
                  :max="INDICATOR_SPECS[indicator.key].max"
                  :disabled="!canEdit"
                />
                <span class="text-xs text-muted-foreground whitespace-nowrap">
                  {{ t(`fleet.settings.indicatorUnit.${INDICATOR_SPECS[indicator.key].unit}`) }}
                </span>
              </div>
            </td>
            <td class="px-3 py-1.5 text-xs text-muted-foreground">
              {{
                t(`fleet.settings.indicatorDirection.${INDICATOR_SPECS[indicator.key].direction}`)
              }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="issues.length && dirty" class="text-destructive text-xs">
        {{ t(`fleet.settings.indicators.issue.${issues[0]!.code}`) }}
      </p>
      <div v-if="canEdit" class="flex gap-2">
        <button
          type="button"
          class="cursor-pointer px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!dirty || saving || issues.length > 0"
          @click="save"
        >
          {{ t('common.save') }}
        </button>
        <button
          v-if="dirty"
          type="button"
          class="cursor-pointer px-3 py-1.5 text-sm border border-border rounded hover:bg-accent"
          @click="reset"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
      <section class="border-t border-border pt-3 space-y-2" data-testid="indicators-appendix">
        <h3 class="text-sm font-semibold text-card-foreground">
          {{ t('fleet.settings.indicators.appendix') }}
        </h3>
        <dl class="space-y-2">
          <div v-for="indicator in indicators" :key="indicator.key">
            <dt class="font-medium text-card-foreground">
              {{ indicator.code }} · {{ indicator.label }}
            </dt>
            <dd class="text-muted-foreground">
              {{ t(`fleet.settings.indicatorDefinition.${indicator.key}`) }}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </FormSection>
</template>
