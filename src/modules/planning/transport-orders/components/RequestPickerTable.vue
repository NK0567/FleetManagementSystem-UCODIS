<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests'
import { formatDate, formatNumber } from '@/utils/format'

defineProps<{
  requests: DeliveryRequestApi[]
  loading?: boolean
  emptyMessage: string
}>()

const picked = defineModel<string[]>({ default: () => [] })

const { t } = useI18n()

function toggle(no: string, checked: boolean) {
  picked.value = checked ? [...picked.value, no] : picked.value.filter((item) => item !== no)
}
</script>

<template>
  <div class="border border-border rounded max-h-72 overflow-auto">
    <table class="w-full text-sm">
      <thead class="sticky top-0">
        <tr class="bg-muted text-xs text-muted-foreground">
          <th class="px-3 py-2 w-8" />
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.request') }}
          </th>
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.point') }}
          </th>
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.product') }}
          </th>
          <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.quantity') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="5" class="px-3 py-4">
            <LoadingSpinner :size="16" />
          </td>
        </tr>
        <tr v-else-if="!requests.length">
          <td colspan="5" class="px-3 py-4 text-muted-foreground">{{ emptyMessage }}</td>
        </tr>
        <tr
          v-for="request in loading ? [] : requests"
          :key="request.no"
          class="border-t border-border cursor-pointer hover:bg-accent"
          :class="picked.includes(request.no) ? 'bg-primary/5' : ''"
          @click="toggle(request.no, !picked.includes(request.no))"
        >
          <td class="px-3 py-2">
            <input
              type="checkbox"
              class="h-4 w-4 accent-primary"
              :checked="picked.includes(request.no)"
              :aria-label="request.no"
              @click.stop
              @change="toggle(request.no, ($event.target as HTMLInputElement).checked)"
            />
          </td>
          <td class="px-3 py-2 whitespace-nowrap">
            <p class="font-medium text-card-foreground">{{ request.no }}</p>
            <p class="text-xs text-muted-foreground">{{ formatDate(request.desiredDate) }}</p>
          </td>
          <td class="px-3 py-2">{{ request.deliveryPointName }}</td>
          <td class="px-3 py-2">{{ request.productName }}</td>
          <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
            {{ formatNumber(request.quantity, 1) }}
            <span class="text-muted-foreground">{{ request.unit }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
