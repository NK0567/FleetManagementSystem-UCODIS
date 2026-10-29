<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle } from '@lucide/vue'
import type { LoadCapacity } from '@/modules/fleet/vehicles/domain/capacity'
import { formatNumber } from '@/utils/format'
import { fillTone, type FillTone, type LoadFill } from '../domain/transportOrder'

/**
 * How full the vehicle is, in weight and in volume (TRS01-US08): green, orange from 90 %, red
 * beyond 100 %. Both are followed, the goods deciding which one matters.
 */
const props = defineProps<{
  fill: LoadFill
  capacity: LoadCapacity | null
  weightKg: number | null
  volumeM3: number | null
  liters?: number | null
}>()

const { t } = useI18n()

const TONES: Record<FillTone, { bar: string; text: string }> = {
  ok: { bar: 'bg-success', text: 'text-success' },
  warning: { bar: 'bg-warning', text: 'text-warning' },
  over: { bar: 'bg-destructive', text: 'text-destructive' }
}

const gauges = computed(() => [
  {
    key: 'weight',
    percent: props.fill.weightPercent,
    load: `${formatNumber(props.weightKg ?? 0, 0)} kg`,
    max: props.capacity?.maxLoadKg != null ? `${formatNumber(props.capacity.maxLoadKg, 0)} kg` : ''
  },
  {
    key: 'volume',
    percent: props.fill.volumePercent,
    load: props.capacity?.capacityL
      ? `${formatNumber(props.liters ?? 0, 0)} L`
      : `${formatNumber(props.volumeM3 ?? 0, 1)} m³`,
    max: props.capacity?.capacityL
      ? `${formatNumber(props.capacity.capacityL, 0)} L`
      : props.capacity?.maxVolumeM3 != null
        ? `${formatNumber(props.capacity.maxVolumeM3, 1)} m³`
        : ''
  }
])

const over = computed(() => gauges.value.some((gauge) => fillTone(gauge.percent) === 'over'))
</script>

<template>
  <div class="space-y-2">
    <p v-if="!capacity" class="text-xs text-muted-foreground">
      {{ t('planning.transportOrders.gauge.noVehicle') }}
    </p>
    <div v-for="gauge in gauges" v-else :key="gauge.key" class="text-sm">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-muted-foreground">{{
          t(`planning.transportOrders.gauge.${gauge.key}`)
        }}</span>
        <span class="tabular-nums" :class="TONES[fillTone(gauge.percent)].text">
          {{ gauge.load }}
          <template v-if="gauge.max"> / {{ gauge.max }}</template>
          <template v-if="gauge.percent !== null">
            · {{ formatNumber(gauge.percent, 0) }} %</template
          >
        </span>
      </div>
      <div
        class="h-2 rounded bg-muted overflow-hidden"
        role="meter"
        :aria-valuenow="gauge.percent ?? 0"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="t(`planning.transportOrders.gauge.${gauge.key}`)"
      >
        <div
          class="h-full rounded transition-all"
          :class="TONES[fillTone(gauge.percent)].bar"
          :style="{ width: `${Math.min(gauge.percent ?? 0, 100)}%` }"
        />
      </div>
      <p v-if="gauge.percent === null" class="text-xs text-muted-foreground mt-0.5">
        {{ t('planning.transportOrders.gauge.unknown') }}
      </p>
    </div>
    <p
      v-if="over"
      class="flex items-start gap-2 rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
    >
      <AlertTriangle class="w-4 h-4 mt-0.5 text-destructive shrink-0" />
      {{ t('planning.transportOrders.gauge.over') }}
    </p>
  </div>
</template>
