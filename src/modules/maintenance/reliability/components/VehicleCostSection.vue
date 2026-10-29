<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { addDays, todayIso } from '@/utils/date'
import { EMPTY_CELL, formatNumber } from '@/utils/format'
import { reliabilityService } from '../services/reliabilityService'
import type { VehicleCostApi } from '../types/reliability.types'

const props = defineProps<{ vehicleNo: string }>()

const { t } = useI18n()
const open = ref(false)
const to = ref(todayIso())
const from = ref(addDays(to.value, -364))
const cost = ref<VehicleCostApi | null>(null)
const error = ref<string | null>(null)

async function load() {
  if (!open.value || !from.value || !to.value || from.value > to.value) return
  error.value = null
  try {
    cost.value = await reliabilityService.vehicleCost(props.vehicleNo, from.value, to.value)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('maintenance.reliability.loadError'))
  }
}

watch([open, () => props.vehicleNo], load)

const lines = computed(() =>
  cost.value
    ? (['maintenance', 'fuel', 'tyres', 'insurance'] as const).map((key) => ({
        key,
        value: cost.value![key]
      }))
    : []
)
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 pb-6">
    <FormSection
      v-model:open="open"
      :title="t('maintenance.vehicleCost.title')"
      :summary="
        cost ? [t('maintenance.vehicleCost.summary', { total: formatNumber(cost.total) })] : []
      "
    >
      <div class="xl:col-span-2 min-w-0 space-y-3 text-sm">
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="load">
          <BaseFormField :label="t('maintenance.reliability.from')">
            <DateFormInput v-model="from" />
          </BaseFormField>
          <BaseFormField :label="t('maintenance.reliability.to')">
            <DateFormInput v-model="to" />
          </BaseFormField>
          <button
            type="submit"
            class="px-3 py-2 border border-border text-sm rounded hover:bg-accent disabled:opacity-60"
            :disabled="!from || !to || from > to"
          >
            {{ t('maintenance.reliability.apply') }}
          </button>
        </form>
        <FormAlerts :error="error" @clear:error="error = null" />
        <template v-if="cost">
          <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <template v-for="line in lines" :key="line.key">
              <dt class="text-muted-foreground">{{ t(`maintenance.vehicleCost.${line.key}`) }}</dt>
              <dd class="tabular-nums text-right">{{ formatNumber(line.value) }}</dd>
            </template>
            <dt class="font-medium">{{ t('maintenance.vehicleCost.total') }}</dt>
            <dd class="tabular-nums text-right font-medium">{{ formatNumber(cost.total) }}</dd>
          </dl>
          <p class="text-muted-foreground">
            {{
              t('maintenance.vehicleCost.perKm', {
                km: formatNumber(cost.km),
                cost: cost.costPerKm === null ? EMPTY_CELL : formatNumber(cost.costPerKm, 2)
              })
            }}
          </p>
          <p class="text-muted-foreground">
            {{
              cost.acquisitionCost === null
                ? t('maintenance.vehicleCost.noAcquisition')
                : t('maintenance.vehicleCost.acquisition', {
                    cost: formatNumber(cost.acquisitionCost)
                  })
            }}
          </p>
        </template>
      </div>
    </FormSection>
  </div>
</template>
