<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNumber } from '@/utils/format'
import { stockItemService } from '../services/stockItemService'
import type { SupplierSupplyApi } from '../types/stockItem.types'

/** On a supplier card: the references it provides the workshop with and its average delay. */
const props = defineProps<{ supplierNo: string }>()

const { t } = useI18n()
const supply = ref<SupplierSupplyApi | null>(null)
const open = ref(true)

watch(
  () => props.supplierNo,
  async (no) => {
    supply.value = no ? await stockItemService.supply(no).catch(() => null) : null
  },
  { immediate: true }
)
</script>

<template>
  <div
    v-if="supply && (supply.items.length || supply.receivedCount)"
    class="px-4 sm:px-6 lg:px-8 pb-6"
  >
    <FormSection
      v-model:open="open"
      :title="t('maintenance.supplierSupply.title')"
      :summary="[t('maintenance.supplierSupply.itemCount', { count: supply.items.length })]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.supplierSupply.averageLeadTime')">
          <FormInput
            :model-value="
              supply.averageLeadTimeDays === null
                ? '-'
                : t('maintenance.supplierSupply.days', {
                    days: formatNumber(supply.averageLeadTimeDays, 1)
                  })
            "
            disabled
          />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.supplierSupply.receivedCount')">
          <FormInput :model-value="String(supply.receivedCount)" disabled />
        </BaseFormField>
      </div>
      <div class="min-w-0">
        <p class="text-xs text-muted-foreground font-semibold mb-1">
          {{ t('maintenance.supplierSupply.items') }}
        </p>
        <p v-if="!supply.items.length" class="text-sm text-muted-foreground">
          {{ t('maintenance.supplierSupply.noItem') }}
        </p>
        <ul v-else class="divide-y divide-border text-sm">
          <li v-for="item in supply.items" :key="item.no" class="py-1.5 flex gap-2">
            <RouterLink
              :to="{ path: '/maintenance/stock-items', query: { no: item.no, cardMode: 'view' } }"
              class="text-primary hover:underline shrink-0"
            >
              {{ item.no }}
            </RouterLink>
            <span class="truncate text-card-foreground">{{ item.name }}</span>
            <span class="ml-auto tabular-nums text-muted-foreground shrink-0">
              {{ formatNumber(item.unitPrice) }} Ar
            </span>
          </li>
        </ul>
      </div>
    </FormSection>
  </div>
</template>
