<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileDown, FileSpreadsheet } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { ReportTable } from '@/modules/fleet/reports/composables/useReportFormat'
import { exportReportPdf, exportReportXlsx } from '@/modules/fleet/reports/services/reportExport'
import { EMPTY_CELL, formatDate, formatNumber } from '@/utils/format'
import { useCarrierReportStore } from '../stores/carrierReportStore'
import type { CarrierReportRow, ReportPeriod } from '../types/planningReport.types'

const { t } = useI18n()
const store = useCarrierReportStore()

const period = ref<ReportPeriod>({ from: '', to: '' })
const exporting = ref(false)
const exportError = ref<string | null>(null)

const COLUMNS = [
  'carrier',
  'orders',
  'punctuality',
  'confirmation',
  'contestation',
  'refusals',
  'invoices',
  'withoutTariff'
] as const
type Column = (typeof COLUMNS)[number]

const PERCENT = new Set<Column>(['punctuality', 'confirmation', 'contestation'])

function cell(row: CarrierReportRow, column: Column) {
  if (column === 'carrier') {
    const text = row.carrierName ? `${row.carrierName} (${row.carrierNo})` : row.carrierNo
    return { text, value: text }
  }
  const value = row[column]
  if (value === null) return { text: EMPTY_CELL, value: null }
  return { text: PERCENT.has(column) ? `${value} %` : formatNumber(value), value }
}

const table = computed<ReportTable>(() => ({
  title: t('planning.reports.section'),
  headers: COLUMNS.map((column) => t(`planning.reports.col.${column}`)),
  numeric: COLUMNS.map((column) => column !== 'carrier'),
  rows: store.rows.map((row) => COLUMNS.map((column) => cell(row, column)))
}))

const subtitle = computed(() => {
  const { from, to } = period.value
  if (!from && !to) return t('planning.reports.allPeriods')
  return t('planning.reports.period', {
    from: from ? formatDate(from) : EMPTY_CELL,
    to: to ? formatDate(to) : EMPTY_CELL
  })
})

const fileName = computed(() =>
  `${t('planning.reports.title')} ${period.value.from} ${period.value.to}`.trim()
)

async function exportAs(format: 'xlsx' | 'pdf') {
  exporting.value = true
  exportError.value = null
  try {
    if (format === 'xlsx') await exportReportXlsx([table.value], fileName.value)
    else {
      await exportReportPdf(
        { title: t('planning.reports.title'), subtitle: subtitle.value },
        [table.value],
        fileName.value,
        t('planning.reports.empty')
      )
    }
  } catch (cause) {
    exportError.value = apiErrorMessage(cause, t('planning.reports.exportError'))
  } finally {
    exporting.value = false
  }
}

watch(period, () => void store.fetchRows(period.value), { deep: true, immediate: true })
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">
          {{ t('planning.reports.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">{{ t('planning.reports.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <button
          v-for="format in ['xlsx', 'pdf'] as const"
          :key="format"
          type="button"
          class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="store.loading || exporting || !store.rows.length"
          @click="exportAs(format)"
        >
          <FileSpreadsheet v-if="format === 'xlsx'" class="w-5 h-5 text-primary" />
          <FileDown v-else class="w-5 h-5 text-primary" />
          {{ t(`planning.reports.export.${format}`) }}
        </button>
      </div>
    </header>

    <section class="grid gap-3 sm:grid-cols-3 max-w-3xl">
      <BaseFormField :label="t('planning.reports.filter.from')">
        <DateFormInput v-model="period.from" />
      </BaseFormField>
      <BaseFormField :label="t('planning.reports.filter.to')">
        <DateFormInput v-model="period.to" />
      </BaseFormField>
    </section>

    <FormAlerts :error="store.error" @clear:error="store.error = null" />
    <FormAlerts :error="exportError" @clear:error="exportError = null" />
    <LoadingBar v-if="store.loading" :height="2" bar-color="var(--color-primary)" />

    <section class="bg-card border border-border rounded overflow-x-auto">
      <div class="px-4 py-3 border-b border-border">
        <h2 class="text-sm font-semibold text-card-foreground">{{ table.title }}</h2>
        <p class="text-xs text-muted-foreground">{{ subtitle }}</p>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th
              v-for="(header, index) in table.headers"
              :key="header"
              class="px-3 py-2 font-semibold whitespace-nowrap"
              :class="table.numeric[index] ? 'text-right' : 'text-left'"
            >
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!table.rows.length">
            <td :colspan="table.headers.length" class="px-3 py-4 text-muted-foreground">
              {{ t('planning.reports.empty') }}
            </td>
          </tr>
          <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex" class="border-t border-border">
            <td
              v-for="(item, index) in row"
              :key="index"
              class="px-3 py-1.5 whitespace-nowrap"
              :class="table.numeric[index] ? 'text-right tabular-nums' : 'text-card-foreground'"
            >
              {{ item.text }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
