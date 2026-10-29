<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { formatDateTime, formatNumber } from '@/utils/format'
import { liveMapService } from '../services/liveMapService'
import type { OnboardReadingsApi } from '../types/liveMap.types'

/** A gauge at a quarter or below is shown as low. */
const LOW_FUEL_PCT = 25

const props = defineProps<{ vehicleNo: string }>()

const { t } = useI18n()
const open = ref(true)
const data = ref<OnboardReadingsApi | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  if (!open.value) return
  loading.value = true
  error.value = null
  try {
    data.value = await liveMapService.readings(props.vehicleNo)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.liveMap.readings.loadError'))
  } finally {
    loading.value = false
  }
}

watch([open, () => props.vehicleNo], load, { immediate: true })

const engineLabel = (on: boolean) =>
  on ? t('fleet.liveMap.readings.engineRunning') : t('fleet.liveMap.readings.engineStopped')
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 pb-6">
    <FormSection
      v-model:open="open"
      :title="t('fleet.liveMap.readings.title')"
      :summary="
        data?.current
          ? [
              t('fleet.liveMap.readings.summary', {
                date: formatDateTime(data.current.at)
              })
            ]
          : []
      "
    >
      <div class="xl:col-span-2 min-w-0 space-y-3 text-sm">
        <FormAlerts :error="error" @clear:error="error = null" />
        <LoadingBar v-if="loading" :height="2" bar-color="var(--color-primary)" />
        <p v-if="data && !data.tracked" class="text-muted-foreground">
          {{ t('fleet.liveMap.readings.untracked') }}
        </p>
        <template v-else-if="data?.current">
          <dl class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div class="rounded border border-border px-3 py-2">
              <dt class="text-xs text-muted-foreground">
                {{ t('fleet.liveMap.readings.odometer') }}
              </dt>
              <dd class="font-semibold text-card-foreground tabular-nums">
                {{ formatNumber(data.current.odometerKm, 0) }} km
              </dd>
            </div>
            <div class="rounded border border-border px-3 py-2">
              <dt class="text-xs text-muted-foreground">{{ t('fleet.liveMap.readings.fuel') }}</dt>
              <dd v-if="data.current.fuelLevelPct !== null">
                <span
                  class="font-semibold tabular-nums"
                  :class="
                    data.current.fuelLevelPct <= LOW_FUEL_PCT
                      ? 'text-destructive'
                      : 'text-card-foreground'
                  "
                >
                  {{ data.current.fuelLevelPct }} %
                </span>
                <div class="h-1.5 mt-1 rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :class="
                      data.current.fuelLevelPct <= LOW_FUEL_PCT ? 'bg-destructive' : 'bg-primary'
                    "
                    :style="{ width: `${data.current.fuelLevelPct}%` }"
                  />
                </div>
              </dd>
              <dd v-else class="text-muted-foreground">{{ t('fleet.liveMap.readings.noTank') }}</dd>
            </div>
            <div class="rounded border border-border px-3 py-2">
              <dt class="text-xs text-muted-foreground">
                {{ t('fleet.liveMap.readings.engine') }}
              </dt>
              <dd class="font-semibold text-card-foreground">
                {{ engineLabel(data.current.engineOn) }}
              </dd>
            </div>
            <div class="rounded border border-border px-3 py-2">
              <dt class="text-xs text-muted-foreground">
                {{ t('fleet.liveMap.readings.faultCode') }}
              </dt>
              <dd v-if="data.faultCodes.length" class="flex flex-wrap gap-x-2">
                <RouterLink
                  v-for="fault in data.faultCodes"
                  :key="fault.eventNo"
                  :to="{
                    path: '/fleet/telematics-events',
                    query: { no: fault.eventNo, cardMode: 'view' }
                  }"
                  class="font-semibold text-destructive hover:underline"
                >
                  {{ fault.code }}
                </RouterLink>
              </dd>
              <dd v-else class="font-semibold text-card-foreground">
                {{ t('fleet.liveMap.readings.noFault') }}
              </dd>
            </div>
            <div class="rounded border border-border px-3 py-2">
              <dt class="text-xs text-muted-foreground">
                {{ t('fleet.liveMap.readings.signal') }}
              </dt>
              <dd
                class="font-semibold"
                :class="data.signalLost ? 'text-destructive' : 'text-card-foreground'"
              >
                {{
                  data.signalLost
                    ? t('fleet.liveMap.readings.signalLost')
                    : t('fleet.liveMap.readings.signalOk')
                }}
              </dd>
            </div>
            <div class="rounded border border-border px-3 py-2">
              <dt class="text-xs text-muted-foreground">
                {{ t('fleet.liveMap.readings.lastReading') }}
              </dt>
              <dd class="font-semibold text-card-foreground">
                {{ formatDateTime(data.current.at) }}
              </dd>
            </div>
          </dl>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-muted-foreground text-left">
                  <th class="py-1 pr-3 font-normal">{{ t('fleet.liveMap.readings.col.at') }}</th>
                  <th class="py-1 pr-3 font-normal text-right">
                    {{ t('fleet.liveMap.readings.col.odometer') }}
                  </th>
                  <th class="py-1 pr-3 font-normal">{{ t('fleet.liveMap.readings.col.fuel') }}</th>
                  <th class="py-1 pr-3 font-normal text-right">
                    {{ t('fleet.liveMap.readings.col.speed') }}
                  </th>
                  <th class="py-1 font-normal">{{ t('fleet.liveMap.readings.col.engine') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in data.readings" :key="row.at" class="border-t border-border">
                  <td class="py-1 pr-3 whitespace-nowrap">{{ formatDateTime(row.at) }}</td>
                  <td class="py-1 pr-3 text-right tabular-nums whitespace-nowrap">
                    {{ formatNumber(row.odometerKm, 0) }} km
                  </td>
                  <td class="py-1 pr-3 whitespace-nowrap">
                    <template v-if="row.fuelLevelPct !== null">
                      <span class="inline-block w-16 h-1.5 mr-2 rounded-full bg-muted align-middle">
                        <span
                          class="block h-full rounded-full"
                          :class="
                            row.fuelLevelPct <= LOW_FUEL_PCT ? 'bg-destructive' : 'bg-primary'
                          "
                          :style="{ width: `${row.fuelLevelPct}%` }"
                        />
                      </span>
                      <span class="tabular-nums">{{ row.fuelLevelPct }} %</span>
                    </template>
                  </td>
                  <td class="py-1 pr-3 text-right tabular-nums whitespace-nowrap">
                    {{ row.speedKmh }} km/h
                  </td>
                  <td class="py-1 whitespace-nowrap">{{ engineLabel(row.engineOn) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </FormSection>
  </div>
</template>
