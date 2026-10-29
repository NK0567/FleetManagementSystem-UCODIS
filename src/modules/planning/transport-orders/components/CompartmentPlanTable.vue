<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { AlertTriangle } from '@lucide/vue'
import { formatNumber } from '@/utils/format'
import type { CompartmentPlanApi } from '../types/transportOrder.types'

/** How the lines fit in the compartments of the vehicle: a proposal, the planner decides. */
const props = defineProps<{ plan: CompartmentPlanApi }>()

const { t } = useI18n()

const rulesOf = (no: number) => props.plan.compartments.find((item) => item.no === no)
const fill = (used: number, volume: number) =>
  volume > 0 ? Math.min(100, (used / volume) * 100) : 0
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="plan.issues.length"
      class="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-card-foreground"
    >
      <p v-for="(issue, index) in plan.issues" :key="index" class="flex items-start gap-2">
        <AlertTriangle class="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
        <span v-if="issue.code === 'noRoom'">
          {{ t('planning.transportOrders.compartments.noRoom', { product: issue.productName }) }}
        </span>
        <span v-else>
          {{
            t('planning.transportOrders.compartments.notFull', {
              no: issue.no,
              used: formatNumber(issue.usedL, 0),
              volume: formatNumber(issue.volumeL, 0)
            })
          }}
        </span>
      </p>
    </div>
    <div class="border border-border rounded overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.compartments.col.no') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.compartments.col.rules') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.compartments.col.content') }}
            </th>
            <th class="px-3 py-2 text-right font-semibold w-48">
              {{ t('planning.transportOrders.compartments.col.fill') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="use in plan.uses" :key="use.no" class="border-t border-border align-top">
            <td class="px-3 py-2 whitespace-nowrap font-medium text-card-foreground">
              {{ t('fleet.vehicles.compartment', { no: use.no }) }}
            </td>
            <td class="px-3 py-2 text-xs text-muted-foreground">
              <p>{{ t(`fleet.vehicles.content.${rulesOf(use.no)?.content ?? 'mixed'}`) }}</p>
              <p>
                {{
                  rulesOf(use.no)?.families.length
                    ? rulesOf(use.no)?.families.join(', ')
                    : t('fleet.vehicles.families.any')
                }}
              </p>
              <p v-if="rulesOf(use.no)?.fullFill">{{ t('fleet.vehicles.fullFill') }}</p>
            </td>
            <td class="px-3 py-2">
              <p v-if="!use.lines.length" class="text-muted-foreground">
                {{ t('planning.transportOrders.compartments.empty') }}
              </p>
              <p v-for="line in use.lines" :key="line.lineNo">
                {{ line.productName }}
                <span class="text-xs text-muted-foreground">
                  · {{ t('planning.transportOrders.picker.line', { no: line.lineNo }) }} ·
                  {{ formatNumber(line.volumeL, 0) }} L
                </span>
              </p>
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center gap-2 justify-end">
                <div class="h-2 w-24 rounded bg-muted overflow-hidden">
                  <div
                    class="h-full bg-primary"
                    :style="{ width: `${fill(use.usedL, use.volumeL)}%` }"
                  />
                </div>
                <span class="tabular-nums text-xs whitespace-nowrap">
                  {{ formatNumber(use.usedL, 0) }} / {{ formatNumber(use.volumeL, 0) }} L
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
