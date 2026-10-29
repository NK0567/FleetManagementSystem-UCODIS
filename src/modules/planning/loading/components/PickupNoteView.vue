<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { PickupNoteApi } from '../types/pickup.types'

/**
 * The pickup note as the site receives it (TRS03-US03): vehicle, driver, date and, compartment
 * by compartment, the products and quantities expected; once confirmed, what was loaded, the
 * site's document reference and, for fuel, the measures (TRS03-US04).
 */
defineProps<{ note: PickupNoteApi }>()
const { t } = useI18n()
const root = ref<HTMLElement | null>(null)
defineExpose({ root })
</script>

<template>
  <div ref="root" class="rounded border border-border text-sm text-card-foreground">
    <div
      class="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 border-b border-border"
    >
      <h3 class="font-semibold">{{ t('planning.pickup.title', { no: note.orderNo }) }}</h3>
      <StatusPill
        class="print-hide"
        :label="t(`planning.pickup.status.${note.status}`)"
        :tone="
          note.status === 'confirmed' ? 'success' : note.status === 'sent' ? 'info' : 'warning'
        "
      />
    </div>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-3 py-2 text-xs">
      <dt class="text-muted-foreground">{{ t('planning.pickup.site') }}</dt>
      <dd>{{ note.pickupSiteName || '—' }}</dd>
      <dt class="text-muted-foreground">{{ t('planning.pickup.date') }}</dt>
      <dd>{{ formatDateTime(note.plannedDeparture) }}</dd>
      <dt class="text-muted-foreground">{{ t('planning.pickup.vehicle') }}</dt>
      <dd>
        {{ note.vehiclePlate || '—' }}
        <template v-if="note.trailerPlate"> · {{ note.trailerPlate }}</template>
        <template v-if="note.carrierName"> · {{ note.carrierName }}</template>
      </dd>
      <dt class="text-muted-foreground">{{ t('planning.pickup.driver') }}</dt>
      <dd>{{ note.driverName || '—' }}</dd>
      <template v-if="note.documentRef">
        <dt class="text-muted-foreground">{{ t('planning.pickup.documentRef') }}</dt>
        <dd>{{ note.documentRef }}</dd>
      </template>
    </dl>
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="bg-muted/50 text-muted-foreground">
          <tr>
            <th class="px-3 py-1.5 text-left font-medium">
              {{ t('planning.pickup.compartment') }}
            </th>
            <th class="px-3 py-1.5 text-left font-medium">{{ t('planning.pickup.recipient') }}</th>
            <th class="px-3 py-1.5 text-left font-medium">{{ t('planning.pickup.product') }}</th>
            <th class="px-3 py-1.5 text-right font-medium">{{ t('planning.pickup.expected') }}</th>
            <th class="px-3 py-1.5 text-right font-medium">{{ t('planning.pickup.loaded') }}</th>
            <th class="px-3 py-1.5 text-left font-medium">{{ t('planning.pickup.measures') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <template v-for="compartment in note.compartments" :key="compartment.no">
            <tr
              v-for="(entry, index) in compartment.entries"
              :key="`${compartment.no}-${entry.lineNo}`"
            >
              <td class="px-3 py-1.5 whitespace-nowrap">
                <template v-if="index === 0">
                  {{
                    compartment.no
                      ? t('planning.pickup.compartmentNo', { no: compartment.no })
                      : t('planning.pickup.oneSpace')
                  }}
                  <span v-if="compartment.volumeL" class="text-muted-foreground">
                    · {{ formatNumber(compartment.volumeL) }} L
                  </span>
                </template>
              </td>
              <td class="px-3 py-1.5">{{ entry.recipientName }}</td>
              <td class="px-3 py-1.5">{{ entry.productName }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                {{ formatNumber(entry.expectedQuantity) }} {{ entry.unit }}
              </td>
              <td class="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                <template v-if="entry.loadedQuantity !== null">
                  {{ formatNumber(entry.loadedQuantity) }} {{ entry.unit }}
                </template>
                <template v-else>—</template>
              </td>
              <td class="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                <template v-if="entry.isFuel && entry.temperatureC !== null">
                  {{
                    t('planning.pickup.fuelMeasures', {
                      temperature: formatNumber(entry.temperatureC, 1),
                      density: formatNumber(entry.density, 3),
                      volume: formatNumber(entry.volume15L)
                    })
                  }}
                </template>
                <template v-else-if="entry.isFuel">{{
                  t('planning.pickup.fuelToMeasure')
                }}</template>
                <template v-else>—</template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <p class="px-3 py-2 border-t border-border text-xs text-muted-foreground">
      <template v-if="note.confirmedAt">
        {{
          t('planning.pickup.confirmedOn', {
            at: formatDateTime(note.confirmedAt),
            by: note.confirmedBy
          })
        }}
      </template>
      <template v-else-if="note.sentAt">
        {{ t('planning.pickup.sentOn', { at: formatDateTime(note.sentAt), to: note.sentTo }) }}
      </template>
      <template v-else>{{ t('planning.pickup.notSent') }}</template>
    </p>
  </div>
</template>
