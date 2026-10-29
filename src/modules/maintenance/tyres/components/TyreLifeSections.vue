<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { SubListColumn } from '@/components/shared/RecordSubList.vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { TyreApi } from '../types/tyre.types'

const props = defineProps<{ tyre: TyreApi }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const open = ref({ use: true, readings: true, history: false })

const asRows = (items: readonly object[]) =>
  items.map((item, index) => ({ ...item, index })) as unknown as Record<string, unknown>[]
const stints = computed(() => asRows(props.tyre.stints))
const readings = computed(() => asRows(props.tyre.readings))
const history = computed(() => asRows(props.tyre.history))

const stintColumns = computed<SubListColumn[]>(() => [
  { sortKey: 'vehicleNo', label: t('maintenance.tyres.life.col.vehicle'), filter: true },
  { sortKey: 'positionCode', label: t('maintenance.tyres.life.col.position'), filter: true },
  {
    sortKey: 'mountedAt',
    label: t('maintenance.tyres.life.col.mountedAt'),
    formatter: (v) => formatDateTime(String(v))
  },
  {
    sortKey: 'dismountedAt',
    label: t('maintenance.tyres.life.col.dismountedAt'),
    formatter: (v) => (v ? formatDateTime(String(v)) : t('maintenance.tyres.life.now'))
  },
  {
    sortKey: 'fromKm',
    label: t('maintenance.tyres.life.col.fromKm'),
    align: 'right',
    formatter: (v) => formatNumber(Number(v))
  },
  {
    sortKey: 'toKm',
    label: t('maintenance.tyres.life.col.toKm'),
    align: 'right',
    formatter: (v) => (v === null ? '…' : formatNumber(Number(v)))
  }
])
const readingColumns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'at',
    label: t('maintenance.tyres.life.col.at'),
    formatter: (v) => formatDateTime(String(v))
  },
  {
    sortKey: 'pressureBar',
    label: t('maintenance.tyres.life.col.pressure'),
    align: 'right',
    formatter: (v) => `${formatNumber(Number(v), 1)} bar`
  },
  {
    sortKey: 'treadMm',
    label: t('maintenance.tyres.life.col.tread'),
    align: 'right',
    formatter: (v) => `${formatNumber(Number(v), 1)} mm`
  },
  { sortKey: 'by', label: t('maintenance.tyres.life.col.by'), filter: true }
])
const historyColumns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'at',
    label: t('maintenance.tyres.life.col.at'),
    formatter: (v) => formatDateTime(String(v))
  },
  {
    sortKey: 'kind',
    label: t('maintenance.tyres.life.col.event'),
    formatter: (v) => optionsStore.getOptionLabel('tyreEvent', v),
    filter: true
  },
  { sortKey: 'detail', label: t('maintenance.tyres.life.col.detail') },
  { sortKey: 'by', label: t('maintenance.tyres.life.col.by'), filter: true }
])
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
        <RecordSubList
          v-else
          :rows="stints"
          :columns="stintColumns"
          row-key="index"
          :empty-text="t('maintenance.tyres.life.neverMounted')"
          :initial-sort="{ key: 'mountedAt', direction: 'DESC' }"
        />
        <p v-if="tyre.scrapReason" class="text-destructive">{{ tyre.scrapReason }}</p>
      </div>
    </FormSection>

    <FormSection
      v-model:open="open.readings"
      :title="t('maintenance.tyres.section.readings')"
      :summary="[t('maintenance.tyres.life.readingCount', tyre.readings.length)]"
    >
      <div class="xl:col-span-2 min-w-0 text-sm">
        <RecordSubList
          :rows="readings"
          :columns="readingColumns"
          row-key="index"
          :empty-text="t('maintenance.tyres.life.noReading')"
          :initial-sort="{ key: 'at', direction: 'DESC' }"
        />
      </div>
    </FormSection>

    <FormSection v-model:open="open.history" :title="t('maintenance.tyres.section.history')">
      <div class="xl:col-span-2 min-w-0">
        <RecordSubList
          :rows="history"
          :columns="historyColumns"
          row-key="index"
          :empty-text="t('maintenance.tyres.life.noHistory')"
          :initial-sort="{ key: 'at', direction: 'DESC' }"
        />
      </div>
    </FormSection>
  </div>
</template>
