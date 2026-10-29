<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { LoadingListApi } from '../types/pickup.types'

/** The loading list as printed for the loading (TRS03-US06). */
const props = defineProps<{
  list: LoadingListApi
  simulate?: boolean
  /** The reference of each line's order, which follows it to the vehicle (TRS01-US06). */
  references?: Record<number, string>
}>()
const { t } = useI18n()

/* The loading simulated in one space: the rank of delivery and the place in the vehicle, the
 * last delivered at the back, the first delivered near the doors. */
const slots = computed(() => {
  const lines = props.list.mode === 'one_space' ? (props.list.groups[0]?.lines ?? []) : []
  const count = lines.length
  return lines.map((line, index) => ({
    ...line,
    loadRank: index + 1,
    deliveryRank: count - index,
    place:
      count === 1
        ? 'back'
        : index < count / 3
          ? 'back'
          : index >= (2 * count) / 3
            ? 'doors'
            : 'middle'
  }))
})
const root = ref<HTMLElement | null>(null)
defineExpose({ root })
</script>

<template>
  <div ref="root" class="text-sm text-card-foreground space-y-2">
    <h3 class="font-semibold">{{ t('planning.loadingList.title', { no: list.orderNo }) }}</h3>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      <dt class="text-muted-foreground">{{ t('planning.pickup.vehicle') }}</dt>
      <dd>
        {{ list.vehiclePlate || '-' }}
        <template v-if="list.trailerPlate"> · {{ list.trailerPlate }}</template>
        <template v-if="list.carrierName"> · {{ list.carrierName }}</template>
      </dd>
      <dt class="text-muted-foreground">{{ t('planning.pickup.driver') }}</dt>
      <dd>{{ list.driverName || '-' }}</dd>
      <dt class="text-muted-foreground">{{ t('planning.pickup.date') }}</dt>
      <dd>{{ formatDateTime(list.plannedDeparture) }}</dd>
    </dl>
    <p class="text-xs text-muted-foreground">
      {{ t(`planning.loadingList.mode.${list.mode}`) }}
    </p>
    <div v-if="simulate && slots.length" class="space-y-1">
      <div
        class="flex items-stretch gap-0.5 rounded border border-border overflow-hidden text-[11px]"
      >
        <span class="px-2 py-3 bg-muted text-muted-foreground flex items-center">{{
          t('planning.loadingList.back')
        }}</span>
        <span
          v-for="slot in slots"
          :key="slot.lineNo"
          class="flex-1 min-w-16 px-2 py-2 bg-primary/10 text-card-foreground"
        >
          <span class="block font-semibold">{{
            t('planning.loadingList.deliveryRank', { rank: slot.deliveryRank })
          }}</span>
          <span class="block truncate">{{ slot.recipientName }}</span>
        </span>
        <span class="px-2 py-3 bg-muted text-muted-foreground flex items-center">{{
          t('planning.loadingList.doors')
        }}</span>
      </div>
      <p class="text-xs text-muted-foreground">{{ t('planning.loadingList.simulationHint') }}</p>
    </div>
    <table class="w-full text-xs border border-border">
      <thead class="bg-muted/50 text-muted-foreground">
        <tr>
          <th class="px-2 py-1.5 text-left font-medium">
            {{
              list.mode === 'compartments'
                ? t('planning.pickup.compartment')
                : t('planning.loadingList.rank')
            }}
          </th>
          <th class="px-2 py-1.5 text-left font-medium">{{ t('planning.pickup.recipient') }}</th>
          <th class="px-2 py-1.5 text-left font-medium">{{ t('planning.pickup.product') }}</th>
          <th
            v-if="simulate && list.mode === 'one_space'"
            class="px-2 py-1.5 text-left font-medium"
          >
            {{ t('planning.loadingList.place') }}
          </th>
          <th class="px-2 py-1.5 text-right font-medium">{{ t('planning.pickup.expected') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <template v-for="group in list.groups" :key="group.title">
          <tr v-for="(line, index) in group.lines" :key="`${group.title}-${line.lineNo}`">
            <td class="px-2 py-1.5 whitespace-nowrap">
              <template v-if="group.compartmentNo !== null">
                {{
                  index === 0 ? t('planning.pickup.compartmentNo', { no: group.compartmentNo }) : ''
                }}
              </template>
              <template v-else>{{ index + 1 }}</template>
            </td>
            <td class="px-2 py-1.5">
              {{ line.recipientName }}
              <span class="text-muted-foreground">· {{ line.deliveryPointName }}</span>
              <span v-if="references?.[line.lineNo]" class="block text-muted-foreground">
                {{ t('planning.loadingList.reference', { reference: references[line.lineNo] }) }}
              </span>
            </td>
            <td class="px-2 py-1.5">{{ line.productName }}</td>
            <td v-if="simulate && list.mode === 'one_space'" class="px-2 py-1.5 whitespace-nowrap">
              {{ t(`planning.loadingList.places.${slots[index]?.place ?? 'middle'}`) }} ·
              {{
                t('planning.loadingList.deliveryRank', { rank: slots[index]?.deliveryRank ?? 0 })
              }}
            </td>
            <td class="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
              {{ formatNumber(line.quantity) }} {{ line.unit }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
