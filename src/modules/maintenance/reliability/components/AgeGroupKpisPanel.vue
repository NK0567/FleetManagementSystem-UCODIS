<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { EMPTY_CELL, formatNumber } from '@/utils/format'
import { targetState } from '../domain/reliability'
import type { AgeGroupKpi } from '../types/reliability.types'

/** MTTR and MTBF by age of the vehicle, each group against its own targets. */
defineProps<{ groups: AgeGroupKpi[] }>()

const { t } = useI18n()

const show = (value: number | null, unit: string, digits = 0) =>
  value === null ? EMPTY_CELL : `${formatNumber(value, digits)}${unit}`

function ageLabel(group: AgeGroupKpi): string {
  return group.toYears === null
    ? t('maintenance.reliability.ageGroups.over', { from: group.fromYears })
    : t('maintenance.reliability.ageGroups.between', {
        from: group.fromYears,
        to: group.toYears
      })
}

const TONES = { reached: 'text-success', missed: 'text-destructive' } as const
</script>

<template>
  <section class="bg-card border border-border rounded">
    <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
      {{ t('maintenance.reliability.ageGroups.title') }}
    </h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-xs text-muted-foreground">
            <th class="px-4 py-2 text-left font-normal">
              {{ t('maintenance.reliability.ageGroups.group') }}
            </th>
            <th class="px-4 py-2 text-right font-normal">
              {{ t('maintenance.reliability.ageGroups.vehicles') }}
            </th>
            <th class="px-4 py-2 text-right font-normal">
              {{ t('maintenance.reliability.failures') }}
            </th>
            <th class="px-4 py-2 text-right font-normal">MTTR</th>
            <th class="px-4 py-2 text-right font-normal">
              {{ t('maintenance.reliability.targets.target') }}
            </th>
            <th class="px-4 py-2 text-right font-normal">MTBF</th>
            <th class="px-4 py-2 text-right font-normal">
              {{ t('maintenance.reliability.targets.target') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="group in groups" :key="group.key">
            <td class="px-4 py-2">
              <span class="font-medium text-card-foreground">
                {{ t(`maintenance.reliability.ageGroups.${group.key}`) }}
              </span>
              <span class="block text-xs text-muted-foreground">{{ ageLabel(group) }}</span>
            </td>
            <td class="px-4 py-2 text-right tabular-nums">{{ group.vehicles }}</td>
            <td class="px-4 py-2 text-right tabular-nums">{{ group.failures }}</td>
            <td
              class="px-4 py-2 text-right tabular-nums"
              :class="
                TONES[targetState(group.mttrHours, group.mttrTargetHours, 'atMost') ?? 'reached']
              "
            >
              {{ show(group.mttrHours, ' h', 1) }}
            </td>
            <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">
              {{ show(group.mttrTargetHours, ' h') }}
            </td>
            <td
              class="px-4 py-2 text-right tabular-nums"
              :class="TONES[targetState(group.mtbfKm, group.mtbfTargetKm, 'atLeast') ?? 'reached']"
            >
              {{ show(group.mtbfKm, ' km') }}
            </td>
            <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">
              {{ show(group.mtbfTargetKm, ' km') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
