<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SubListColumn } from '@/components/shared/RecordSubList.vue'
import { formatDateTime } from '@/utils/format'
import type { TransportOrderEventApi } from '../types/transportOrder.types'

const props = defineProps<{ events: TransportOrderEventApi[] }>()

const { t } = useI18n()

const rows = computed(() => props.events.map((event, index) => ({ ...event, index })))
const columns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'at',
    label: t('planning.transportOrders.history.at'),
    formatter: (v) => formatDateTime(String(v))
  },
  {
    sortKey: 'kind',
    label: t('planning.transportOrders.history.kind'),
    formatter: (v) => t(`planning.transportOrders.history.${String(v)}`),
    filter: true
  },
  { sortKey: 'detail', label: t('planning.transportOrders.history.detail') },
  { sortKey: 'by', label: t('planning.transportOrders.history.by'), filter: true }
])
</script>

<template>
  <RecordSubList
    :rows="rows"
    :columns="columns"
    :row-key="(row: Record<string, unknown>) => `${row.at}-${row.kind}-${row.index}`"
    :empty-text="t('planning.transportOrders.history.empty')"
    :initial-sort="{ key: 'at', direction: 'DESC' }"
  />
</template>
