<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime, formatNumber } from '@/utils/format'
import { stockItemService } from '../services/stockItemService'
import type { StockMovementApi } from '../types/stockItem.types'

/** `version` changes whenever the item's stock may have moved, so the ledger reloads. */
const props = defineProps<{ itemNo: string; version: number }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()

const movements = ref<StockMovementApi[]>([])
const error = ref<string | null>(null)
const open = ref(true)

watch(
  () => [props.itemNo, props.version],
  async () => {
    error.value = null
    try {
      movements.value = await stockItemService.movements(props.itemNo)
    } catch (cause) {
      error.value = apiErrorMessage(cause, t('maintenance.stockItems.movements.loadError'))
    }
  },
  { immediate: true }
)

const order = (no: string) => ({
  path: '/maintenance/work-orders',
  query: { no, cardMode: 'view' }
})
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 pb-6">
    <FormAlerts :error="error" @clear:error="error = null" />
    <FormSection
      v-model:open="open"
      :title="t('maintenance.stockItems.movements.title')"
      :summary="[t('maintenance.stockItems.movements.count', movements.length)]"
    >
      <div class="xl:col-span-2 min-w-0">
        <p v-if="!movements.length" class="text-sm text-muted-foreground">
          {{ t('maintenance.stockItems.movements.empty') }}
        </p>
        <table v-else class="w-full text-sm border border-border rounded">
          <tbody>
            <tr
              v-for="movement in movements"
              :key="movement.no"
              class="border-t border-border first:border-t-0"
            >
              <td class="px-3 py-1.5 whitespace-nowrap">{{ formatDateTime(movement.at) }}</td>
              <td class="px-3 py-1.5">
                {{ optionsStore.getOptionLabel('stockMovementKind', movement.kind) }}
              </td>
              <td
                class="px-3 py-1.5 text-right tabular-nums"
                :class="movement.delta < 0 ? 'text-destructive' : 'text-success'"
              >
                {{ movement.delta > 0 ? '+' : '' }}{{ formatNumber(movement.delta) }}
              </td>
              <td class="px-3 py-1.5">
                {{ movement.reason }}
                <RouterLink
                  v-if="movement.workOrderNo"
                  :to="order(movement.workOrderNo)"
                  class="text-primary hover:underline"
                >
                  {{ movement.workOrderNo }}
                </RouterLink>
                <span v-if="movement.vehiclePlate" class="text-muted-foreground">
                  · {{ movement.vehiclePlate }}
                </span>
              </td>
              <td class="px-3 py-1.5 text-muted-foreground">{{ movement.recordedBy }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </FormSection>
  </div>
</template>
