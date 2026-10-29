<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import type { SubListColumn } from '@/components/shared/RecordSubList.vue'
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

const columns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'at',
    label: t('maintenance.stockItems.movements.col.at'),
    formatter: (v) => formatDateTime(String(v))
  },
  {
    sortKey: 'kind',
    label: t('maintenance.stockItems.movements.col.kind'),
    formatter: (v) => optionsStore.getOptionLabel('stockMovementKind', v),
    filter: true
  },
  { sortKey: 'delta', label: t('maintenance.stockItems.movements.col.delta'), align: 'right' },
  { sortKey: 'reason', label: t('maintenance.stockItems.movements.col.reason') },
  { sortKey: 'recordedBy', label: t('maintenance.stockItems.movements.col.by'), filter: true }
])

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
        <RecordSubList
          :rows="movements as unknown as Record<string, unknown>[]"
          :columns="columns"
          row-key="no"
          :empty-text="t('maintenance.stockItems.movements.empty')"
          :initial-sort="{ key: 'at', direction: 'DESC' }"
        >
          <template #cell-delta="{ row }">
            <span :class="Number(row.delta) < 0 ? 'text-destructive' : 'text-success'">
              {{ Number(row.delta) > 0 ? '+' : '' }}{{ formatNumber(Number(row.delta)) }}
            </span>
          </template>
          <template #cell-reason="{ row }">
            {{ row.reason }}
            <RouterLink
              v-if="row.workOrderNo"
              :to="order(String(row.workOrderNo))"
              class="text-primary hover:underline"
            >
              {{ row.workOrderNo }}
            </RouterLink>
            <span v-if="row.vehiclePlate" class="text-muted-foreground">
              · {{ row.vehiclePlate }}
            </span>
          </template>
        </RecordSubList>
      </div>
    </FormSection>
  </div>
</template>
