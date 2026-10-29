<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { SubListColumn } from '@/components/shared/RecordSubList.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDate, formatNumber } from '@/utils/format'
import { vehicleService } from '../services/vehicleService'
import type { VehicleMaintenanceEntry } from '../types/vehicleRecords.types'

/** Work orders and plan operations of the vehicle, read from the maintenance module. */
const props = defineProps<{ vehicleNo: string }>()

const { t } = useI18n()
const router = useRouter()
const optionsStore = useOptionsStore()
const { canRead } = usePermissions('WORKORDER')
const entries = ref<VehicleMaintenanceEntry[]>([])
const error = ref<string | null>(null)

async function load() {
  if (!canRead.value) return
  error.value = null
  try {
    entries.value = await vehicleService.maintenanceLog(props.vehicleNo)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.vehicles.maintenanceLog.loadError'))
  }
}

watch(() => props.vehicleNo, load, { immediate: true })

const columns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'date',
    label: t('fleet.vehicles.maintenanceLog.date'),
    formatter: (v) => formatDate(String(v))
  },
  {
    sortKey: 'kind',
    label: t('fleet.vehicles.maintenanceLog.kind'),
    formatter: (v) => t(`fleet.vehicles.maintenanceLog.kinds.${String(v)}`),
    filter: true
  },
  { sortKey: 'no', label: t('fleet.vehicles.maintenanceLog.no') },
  { sortKey: 'label', label: t('fleet.vehicles.maintenanceLog.label') },
  {
    sortKey: 'maintenanceType',
    label: t('fleet.vehicles.maintenanceLog.maintenanceType'),
    formatter: (v) => optionsStore.getOptionLabel('maintenanceType', String(v)),
    filter: true
  },
  {
    sortKey: 'status',
    label: t('fleet.vehicles.maintenanceLog.status'),
    formatter: (v) => (v ? optionsStore.getOptionLabel('workOrderStatus', String(v)) : '')
  },
  {
    sortKey: 'km',
    label: t('fleet.vehicles.maintenanceLog.km'),
    align: 'right',
    formatter: (v) => (v === null || v === undefined ? '' : formatNumber(Number(v), 0))
  },
  {
    sortKey: 'cost',
    label: t('fleet.vehicles.maintenanceLog.cost'),
    align: 'right',
    formatter: (v) => (v === null || v === undefined ? '' : formatNumber(Number(v), 0))
  }
])

function open(row: Record<string, unknown>) {
  const no = row.kind === 'work_order' ? row.no : row.workOrderNo
  if (typeof no === 'string' && no) {
    void router.push({ path: '/maintenance/work-orders', query: { no, cardMode: 'view' } })
  }
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="!canRead" class="text-sm text-muted-foreground">
      {{ t('fleet.vehicles.maintenanceLog.noAccess') }}
    </p>
    <template v-else>
      <FormAlerts :error="error" @clear:error="error = null" />
      <RecordSubList
        :rows="entries as unknown as Record<string, unknown>[]"
        :columns="columns"
        :row-key="(row: Record<string, unknown>) => `${row.kind}-${row.no}`"
        :empty-text="t('fleet.vehicles.maintenanceLog.empty')"
        :initial-sort="{ key: 'date', direction: 'DESC' }"
        clickable
        @row-click="open"
      />
    </template>
  </div>
</template>
