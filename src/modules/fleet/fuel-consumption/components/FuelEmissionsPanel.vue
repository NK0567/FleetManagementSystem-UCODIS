<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronRight } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime, formatNumber } from '@/utils/format'
import { fuelConsumptionService } from '../services/fuelConsumptionService'
import type { VehicleEmissionsApi } from '../types/fuelConsumption.types'

/** Emissions and eco-driving of each vehicle, opened from the consumption screen. */
const { t } = useI18n()
const optionsStore = useOptionsStore()
const open = ref(false)
const rows = ref<VehicleEmissionsApi[] | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const expanded = ref<string | null>(null)

async function load() {
  if (!open.value) return
  loading.value = true
  error.value = null
  try {
    rows.value = await fuelConsumptionService.emissions()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.fuelConsumption.emissions.loadError'))
  } finally {
    loading.value = false
  }
}

watch(open, load)

const totalTons = computed(() =>
  formatNumber((rows.value ?? []).reduce((total, row) => total + row.co2Kg, 0) / 1000, 1)
)

function measure(value: number | null, unit: string | null) {
  if (value === null) return ''
  const label = unit ? optionsStore.getOptionLabel('telematicsUnit', unit) : ''
  return `${formatNumber(value, value % 1 ? 2 : 0)} ${label}`.trim()
}

function toggle(vehicleNo: string) {
  expanded.value = expanded.value === vehicleNo ? null : vehicleNo
}
</script>

<template>
  <div class="mx-4 mt-2">
    <FormSection
      v-model:open="open"
      :title="t('fleet.fuelConsumption.emissions.title')"
      :summary="
        rows
          ? [t('fleet.fuelConsumption.emissions.summary', { count: rows.length, tons: totalTons })]
          : []
      "
    >
      <div class="xl:col-span-2 min-w-0 space-y-2 text-sm">
        <FormAlerts :error="error" @clear:error="error = null" />
        <LoadingBar v-if="loading" :height="2" bar-color="var(--color-primary)" />
        <p v-if="rows && !rows.length" class="text-muted-foreground">
          {{ t('fleet.fuelConsumption.emissions.empty') }}
        </p>
        <div v-else-if="rows" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-muted-foreground text-left">
                <th class="py-1 pr-3 font-normal">
                  {{ t('fleet.fuelConsumption.col.vehiclePlate') }}
                </th>
                <th class="py-1 pr-3 font-normal">
                  {{ t('fleet.fuelConsumption.emissions.col.fuelType') }}
                </th>
                <th class="py-1 pr-3 font-normal text-right">
                  {{ t('fleet.fuelConsumption.emissions.col.liters') }}
                </th>
                <th class="py-1 pr-3 font-normal text-right">
                  {{ t('fleet.fuelConsumption.emissions.col.co2Kg') }}
                </th>
                <th class="py-1 pr-3 font-normal text-right">
                  {{ t('fleet.fuelConsumption.emissions.col.gramsPerKm') }}
                </th>
                <th class="py-1 font-normal">
                  {{ t('fleet.fuelConsumption.emissions.col.ecoEvents') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in rows" :key="row.vehicleNo">
                <tr class="border-t border-border">
                  <td class="py-1 pr-3 font-medium text-card-foreground whitespace-nowrap">
                    {{ row.vehiclePlate }}
                  </td>
                  <td class="py-1 pr-3 whitespace-nowrap">
                    {{ row.fuelType ? optionsStore.getOptionLabel('fuelType', row.fuelType) : '' }}
                  </td>
                  <td class="py-1 pr-3 text-right tabular-nums">{{ formatNumber(row.liters) }}</td>
                  <td class="py-1 pr-3 text-right tabular-nums">{{ formatNumber(row.co2Kg) }}</td>
                  <td class="py-1 pr-3 text-right tabular-nums">
                    {{ row.co2GramsPerKm === null ? '' : formatNumber(row.co2GramsPerKm) }}
                  </td>
                  <td class="py-1">
                    <button
                      v-if="row.ecoEvents.length"
                      type="button"
                      class="cursor-pointer inline-flex items-center gap-1 text-primary hover:underline"
                      :aria-expanded="expanded === row.vehicleNo"
                      @click="toggle(row.vehicleNo)"
                    >
                      <component
                        :is="expanded === row.vehicleNo ? ChevronDown : ChevronRight"
                        class="w-4 h-4"
                      />
                      {{
                        t('fleet.fuelConsumption.emissions.ecoCount', {
                          count: row.ecoEvents.length
                        })
                      }}
                    </button>
                    <span v-else class="text-muted-foreground">
                      {{ t('fleet.fuelConsumption.emissions.noEco') }}
                    </span>
                  </td>
                </tr>
                <tr v-if="expanded === row.vehicleNo">
                  <td colspan="6" class="pb-2 pl-4">
                    <ul class="space-y-1">
                      <li v-for="event in row.ecoEvents" :key="event.no" class="text-xs">
                        <RouterLink
                          :to="{
                            path: '/fleet/telematics-events',
                            query: { no: event.no, cardMode: 'view' }
                          }"
                          class="text-primary hover:underline"
                        >
                          {{ event.eventTypeName }}
                        </RouterLink>
                        <template v-if="event.value !== null">
                          ({{ measure(event.value, event.unit) }})
                        </template>
                        <span class="text-muted-foreground">
                          · {{ formatDateTime(event.occurredAt) }}
                          <template v-if="event.siteName"> · {{ event.siteName }}</template>
                          <template v-if="event.driverName"> · {{ event.driverName }}</template>
                        </span>
                      </li>
                    </ul>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </FormSection>
  </div>
</template>
