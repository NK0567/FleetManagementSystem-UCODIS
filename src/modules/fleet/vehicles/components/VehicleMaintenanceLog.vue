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
  { sortKey: 'subsystemName', label: t('fleet.vehicles.maintenanceLog.subsystem'), filter: true },
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
    sortKey: 'partsCost',
    label: t('fleet.vehicles.maintenanceLog.partsCost'),
    align: 'right',
    formatter: (v) => (v === null || v === undefined ? '' : formatNumber(Number(v), 0))
  },
  {
    sortKey: 'labourCost',
    label: t('fleet.vehicles.maintenanceLog.labourCost'),
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

/** Orders of the vehicle grouped by subsystem, with what each subsystem cost. */
const bySubsystem = computed(() => {
  const groups = new Map<
    string,
    {
      name: string
      orders: number
      parts: number
      labour: number
      external: number
      imported: number
      total: number
    }
  >()
  for (const entry of entries.value) {
    if (entry.kind !== 'work_order' || entry.cost === null) continue
    const name = entry.subsystemName || t('fleet.vehicles.maintenanceLog.noSubsystem')
    const group = groups.get(name) ?? {
      name,
      orders: 0,
      parts: 0,
      labour: 0,
      external: 0,
      imported: 0,
      total: 0
    }
    group.orders += 1
    group.parts += entry.partsCost ?? 0
    group.labour += entry.labourCost ?? 0
    group.external += entry.externalCost ?? 0
    group.imported += entry.importedCost ?? 0
    group.total += entry.cost
    groups.set(name, group)
  }
  return [...groups.values()].sort((a, b) => b.total - a.total)
})

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
      <div v-if="bySubsystem.length" class="overflow-x-auto">
        <p class="text-xs font-semibold uppercase text-muted-foreground mb-1">
          {{ t('fleet.vehicles.maintenanceLog.bySubsystem') }}
        </p>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted-foreground">
              <th class="py-1 pr-3 font-medium">
                {{ t('fleet.vehicles.maintenanceLog.subsystem') }}
              </th>
              <th class="py-1 pr-3 font-medium text-right">
                {{ t('fleet.vehicles.maintenanceLog.orders') }}
              </th>
              <th class="py-1 pr-3 font-medium text-right">
                {{ t('fleet.vehicles.maintenanceLog.partsCost') }}
              </th>
              <th class="py-1 pr-3 font-medium text-right">
                {{ t('fleet.vehicles.maintenanceLog.labourCost') }}
              </th>
              <th class="py-1 pr-3 font-medium text-right">
                {{ t('fleet.vehicles.maintenanceLog.externalCost') }}
              </th>
              <th class="py-1 pr-3 font-medium text-right">
                {{ t('fleet.vehicles.maintenanceLog.importedCost') }}
              </th>
              <th class="py-1 font-medium text-right">
                {{ t('fleet.vehicles.maintenanceLog.cost') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in bySubsystem" :key="group.name" class="border-t border-border">
              <td class="py-1 pr-3">{{ group.name }}</td>
              <td class="py-1 pr-3 text-right">{{ formatNumber(group.orders, 0) }}</td>
              <td class="py-1 pr-3 text-right">{{ formatNumber(group.parts, 0) }}</td>
              <td class="py-1 pr-3 text-right">{{ formatNumber(group.labour, 0) }}</td>
              <td class="py-1 pr-3 text-right">{{ formatNumber(group.external, 0) }}</td>
              <td class="py-1 pr-3 text-right">{{ formatNumber(group.imported, 0) }}</td>
              <td class="py-1 text-right font-medium">{{ formatNumber(group.total, 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
