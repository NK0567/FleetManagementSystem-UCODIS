<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MaintenanceTargetSettings } from '@/modules/maintenance/maintenance-settings/domain/maintenanceSettings'
import { EMPTY_CELL, formatNumber } from '@/utils/format'
import { targetState, type ReliabilityKpis } from '../domain/reliability'
import type { MaintenanceSteering } from '../types/reliability.types'

/** The indicators that have a target, each one read against it (FLT07-US03). */
const props = defineProps<{
  kpis: ReliabilityKpis
  preventiveCompletion: MaintenanceSteering['preventiveCompletion']
  targets: MaintenanceTargetSettings
}>()

const { t } = useI18n()

const show = (value: number | null, unit: string, digits = 0) =>
  value === null ? EMPTY_CELL : `${formatNumber(value, digits)}${unit}`

const rows = computed(() => [
  {
    key: 'preventiveShare',
    value: show(props.kpis.preventiveShare, ' %'),
    target: `${props.targets.preventiveShareTargetPct} %`,
    state: targetState(
      props.kpis.preventiveShare,
      props.targets.preventiveShareTargetPct,
      'atLeast'
    )
  },
  {
    key: 'preventiveCompletion',
    value: show(props.preventiveCompletion.rate, ' %'),
    target: `${props.targets.preventiveCompletionTargetPct} %`,
    state: targetState(
      props.preventiveCompletion.rate,
      props.targets.preventiveCompletionTargetPct,
      'atLeast'
    )
  },
  {
    key: 'mttrHours',
    value: show(props.kpis.mttrHours, ' h', 1),
    target: `${formatNumber(props.targets.mttrTargetHours)} h`,
    state: targetState(props.kpis.mttrHours, props.targets.mttrTargetHours, 'atMost')
  },
  {
    key: 'mtbfKm',
    value: show(props.kpis.mtbfKm, ' km'),
    target: `${formatNumber(props.targets.mtbfTargetKm)} km`,
    state: targetState(props.kpis.mtbfKm, props.targets.mtbfTargetKm, 'atLeast')
  }
])
</script>

<template>
  <section class="bg-card border border-border rounded">
    <div class="flex items-center justify-between px-4 py-3 border-b border-border">
      <h2 class="text-sm font-semibold text-card-foreground">
        {{ t('maintenance.reliability.targets.title') }}
      </h2>
      <RouterLink to="/maintenance/settings" class="text-xs text-primary hover:underline">
        {{ t('maintenance.reliability.targets.settings') }}
      </RouterLink>
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr class="text-xs text-muted-foreground">
          <th class="px-4 py-2 text-left font-normal">
            {{ t('maintenance.reliability.targets.indicator') }}
          </th>
          <th class="px-4 py-2 text-right font-normal">
            {{ t('maintenance.reliability.targets.value') }}
          </th>
          <th class="px-4 py-2 text-right font-normal">
            {{ t('maintenance.reliability.targets.target') }}
          </th>
          <th class="px-4 py-2 text-left font-normal">
            {{ t('maintenance.reliability.targets.state') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key" class="border-t border-border">
          <td class="px-4 py-2">{{ t(`maintenance.reliability.kpi.${row.key}`) }}</td>
          <td class="px-4 py-2 text-right tabular-nums font-medium">{{ row.value }}</td>
          <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">{{ row.target }}</td>
          <td
            class="px-4 py-2"
            :class="row.state === 'missed' ? 'text-destructive' : 'text-muted-foreground'"
          >
            {{ row.state ? t(`maintenance.reliability.targets.${row.state}`) : EMPTY_CELL }}
          </td>
        </tr>
      </tbody>
    </table>
    <p class="px-4 pb-3 text-xs text-muted-foreground">
      {{
        t('maintenance.reliability.targets.completionBasis', {
          done: preventiveCompletion.done,
          due: preventiveCompletion.due,
          missed: preventiveCompletion.missedServices
        })
      }}
    </p>
  </section>
</template>
