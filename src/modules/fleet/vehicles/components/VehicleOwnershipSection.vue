<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { formatDate, formatNumber } from '@/utils/format'
import { vehicleService } from '../services/vehicleService'
import type { VehicleOwnershipCostApi } from '../types/vehicleRecords.types'

/** Total cost of ownership since the vehicle entered the park, acquisition included. */
const props = defineProps<{ vehicleNo: string }>()

const { t } = useI18n()
const open = ref(false)
const cost = ref<VehicleOwnershipCostApi | null>(null)
const error = ref<string | null>(null)

async function load() {
  if (!open.value) return
  error.value = null
  try {
    cost.value = await vehicleService.ownershipCost(props.vehicleNo)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.vehicles.ownership.loadError'))
  }
}

watch([open, () => props.vehicleNo], load)

const lines = computed(() =>
  cost.value
    ? (['acquisition', 'maintenance', 'fuel', 'tyres', 'insurance'] as const).map((key) => ({
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
      :title="t('fleet.vehicles.ownership.title')"
      :summary="
        cost ? [t('fleet.vehicles.ownership.summary', { total: formatNumber(cost.total) })] : []
      "
    >
      <div class="xl:col-span-2 min-w-0 space-y-3 text-sm" data-testid="vehicle-ownership">
        <FormAlerts :error="error" @clear:error="error = null" />
        <template v-if="cost">
          <p class="text-muted-foreground">
            {{
              t('fleet.vehicles.ownership.period', {
                from: formatDate(cost.from),
                to: formatDate(cost.to)
              })
            }}
          </p>
          <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 max-w-md">
            <template v-for="line in lines" :key="line.key">
              <dt class="text-muted-foreground">{{ t(`fleet.vehicles.ownership.${line.key}`) }}</dt>
              <dd class="tabular-nums text-right">{{ formatNumber(line.value) }}</dd>
            </template>
            <dt class="font-medium">{{ t('fleet.vehicles.ownership.total') }}</dt>
            <dd class="tabular-nums text-right font-medium">{{ formatNumber(cost.total) }}</dd>
          </dl>
          <p v-if="!cost.acquisitionKnown" class="text-warning">
            {{ t('fleet.vehicles.ownership.noAcquisition') }}
          </p>
          <p class="text-muted-foreground">
            {{
              cost.costPerKm === null
                ? t('fleet.vehicles.ownership.noKm')
                : t('fleet.vehicles.ownership.perKm', {
                    km: formatNumber(cost.km),
                    cost: formatNumber(cost.costPerKm, 2)
                  })
            }}
          </p>
          <p v-if="cost.residualValue !== null" class="text-muted-foreground">
            {{
              t('fleet.vehicles.ownership.residualValue', {
                value: formatNumber(cost.residualValue)
              })
            }}
          </p>
          <p class="text-xs text-muted-foreground">{{ t('fleet.vehicles.ownership.hint') }}</p>
        </template>
      </div>
    </FormSection>
  </div>
</template>
