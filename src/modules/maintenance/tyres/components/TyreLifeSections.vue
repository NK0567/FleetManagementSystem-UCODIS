<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { TyreApi } from '../types/tyre.types'

defineProps<{ tyre: TyreApi }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const open = ref({ use: true, readings: true, history: false })
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 pb-6">
    <FormSection
      v-model:open="open.use"
      :title="t('maintenance.tyres.section.use')"
      :summary="[
        t('maintenance.tyres.life.useSummary', {
          km: formatNumber(tyre.kmRun),
          cost: tyre.costPerKm === null ? '—' : formatNumber(tyre.costPerKm, 2)
        })
      ]"
    >
      <div class="xl:col-span-2 min-w-0 space-y-2 text-sm">
        <p>
          {{
            t('maintenance.tyres.life.cost', {
              price: formatNumber(tyre.price),
              retreads: tyre.retreadCount,
              retreadCost: formatNumber(tyre.retreadCost),
              total: formatNumber(tyre.totalCost)
            })
          }}
        </p>
        <p v-if="!tyre.stints.length" class="text-muted-foreground">
          {{ t('maintenance.tyres.life.neverMounted') }}
        </p>
        <table v-else class="w-full border border-border rounded">
          <tbody>
            <tr
              v-for="(stint, index) in tyre.stints"
              :key="index"
              class="border-t border-border first:border-t-0"
            >
              <td class="px-3 py-1.5">{{ stint.vehicleNo }} · {{ stint.positionCode }}</td>
              <td class="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                {{ formatDateTime(stint.mountedAt) }} →
                {{
                  stint.dismountedAt
                    ? formatDateTime(stint.dismountedAt)
                    : t('maintenance.tyres.life.now')
                }}
              </td>
              <td class="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                {{ formatNumber(stint.fromKm) }} →
                {{ stint.toKm === null ? '…' : formatNumber(stint.toKm) }} km
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="tyre.scrapReason" class="text-destructive">{{ tyre.scrapReason }}</p>
      </div>
    </FormSection>

    <FormSection
      v-model:open="open.readings"
      :title="t('maintenance.tyres.section.readings')"
      :summary="[t('maintenance.tyres.life.readingCount', tyre.readings.length)]"
    >
      <div class="xl:col-span-2 min-w-0 text-sm">
        <p v-if="!tyre.readings.length" class="text-muted-foreground">
          {{ t('maintenance.tyres.life.noReading') }}
        </p>
        <ul v-else class="divide-y divide-border border border-border rounded">
          <li
            v-for="(reading, index) in [...tyre.readings].reverse()"
            :key="index"
            class="px-3 py-1.5 flex flex-wrap gap-x-3"
          >
            <span class="whitespace-nowrap">{{ formatDateTime(reading.at) }}</span>
            <span class="tabular-nums">{{ formatNumber(reading.pressureBar, 1) }} bar</span>
            <span class="tabular-nums">{{ formatNumber(reading.treadMm, 1) }} mm</span>
            <span class="text-muted-foreground">{{ reading.by }}</span>
          </li>
        </ul>
      </div>
    </FormSection>

    <FormSection v-model:open="open.history" :title="t('maintenance.tyres.section.history')">
      <ul class="xl:col-span-2 min-w-0 text-sm divide-y divide-border">
        <li
          v-for="(event, index) in [...tyre.history].reverse()"
          :key="index"
          class="py-1.5 flex flex-wrap gap-x-3"
        >
          <span class="whitespace-nowrap">{{ formatDateTime(event.at) }}</span>
          <span class="font-medium">{{
            optionsStore.getOptionLabel('tyreEvent', event.kind)
          }}</span>
          <span class="text-muted-foreground">{{ event.detail }}</span>
          <span class="text-muted-foreground">{{ event.by }}</span>
        </li>
      </ul>
    </FormSection>
  </div>
</template>
