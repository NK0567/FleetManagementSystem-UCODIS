<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileDown, FileSpreadsheet } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { todayIso } from '@/utils/date'
import { formatDate } from '@/utils/format'
import { useReportFormat } from '../composables/useReportFormat'
import { exportReportPdf, exportReportXlsx } from '../services/reportExport'
import { fleetReportService } from '../services/fleetReportService'
import {
  REPORT_KINDS,
  type FleetReportApi,
  type ReportFilters,
  type ReportKind
} from '../types/fleetReport.types'

const { t } = useI18n()
const { toTable } = useReportFormat()

const today = todayIso()
const kind = ref<ReportKind>('summary')
const filters = ref<ReportFilters>({ from: `${today.slice(0, 7)}-01`, to: today, siteNo: null })
const report = ref<FleetReportApi | null>(null)
const loading = ref(false)
const exporting = ref(false)
const error = ref<string | null>(null)

async function load() {
  if (!filters.value.from || !filters.value.to) return
  loading.value = true
  error.value = null
  try {
    report.value = await fleetReportService.get(kind.value, filters.value)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.reports.loadError'))
  } finally {
    loading.value = false
  }
}

watch([kind, filters], load, { deep: true, immediate: true })

const tables = computed(() =>
  report.value ? report.value.sections.map((section) => toTable(report.value!.kind, section)) : []
)

const subtitle = computed(() => {
  if (!report.value) return ''
  const period = t('fleet.reports.period', {
    from: formatDate(report.value.from),
    to: formatDate(report.value.to)
  })
  return report.value.siteName ? `${period} · ${report.value.siteName}` : period
})

const fileName = computed(() =>
  report.value
    ? `${t(`fleet.reports.kind.${report.value.kind}`)} ${report.value.from} ${report.value.to}`
    : ''
)

async function exportAs(format: 'xlsx' | 'pdf') {
  if (!report.value) return
  exporting.value = true
  error.value = null
  try {
    if (format === 'xlsx') await exportReportXlsx(tables.value, fileName.value)
    else {
      await exportReportPdf(
        { title: t(`fleet.reports.kind.${report.value.kind}`), subtitle: subtitle.value },
        tables.value,
        fileName.value,
        t('fleet.reports.empty')
      )
    }
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.reports.exportError'))
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">{{ t('fleet.reports.title') }}</h1>
        <p class="text-sm text-muted-foreground">{{ subtitle }}</p>
      </div>
      <div class="flex gap-2">
        <button
          v-for="format in ['xlsx', 'pdf'] as const"
          :key="format"
          type="button"
          class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!report || loading || exporting"
          @click="exportAs(format)"
        >
          <FileSpreadsheet v-if="format === 'xlsx'" class="w-5 h-5 text-primary" />
          <FileDown v-else class="w-5 h-5 text-primary" />
          {{ t(`fleet.reports.export.${format}`) }}
        </button>
      </div>
    </header>

    <nav class="flex flex-wrap gap-1 border-b border-border">
      <button
        v-for="item in REPORT_KINDS"
        :key="item"
        type="button"
        class="cursor-pointer px-3 py-2 text-sm border-b-2 -mb-px transition"
        :class="
          kind === item
            ? 'border-primary text-card-foreground font-medium'
            : 'border-transparent text-muted-foreground hover:text-card-foreground'
        "
        @click="kind = item"
      >
        {{ t(`fleet.reports.kind.${item}`) }}
      </button>
    </nav>

    <section class="grid gap-3 sm:grid-cols-3 max-w-3xl">
      <BaseFormField :label="t('fleet.reports.filter.from')">
        <DateFormInput v-model="filters.from" />
      </BaseFormField>
      <BaseFormField :label="t('fleet.reports.filter.to')">
        <DateFormInput v-model="filters.to" />
      </BaseFormField>
      <BaseFormField :label="t('fleet.reports.filter.site')">
        <ReferenceLookup
          :model-value="filters.siteNo ?? ''"
          reference-key="sites"
          :modal-title="t('fleet.reports.filter.site')"
          @update:model-value="filters.siteNo = $event ? String($event) : null"
        />
      </BaseFormField>
    </section>

    <FormAlerts :error="error" @clear:error="error = null" />
    <LoadingBar v-if="loading" :height="2" bar-color="var(--color-primary)" />

    <section
      v-for="table in tables"
      :key="table.title"
      class="bg-card border border-border rounded overflow-x-auto"
    >
      <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
        {{ table.title }}
      </h2>
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
              {{ t('fleet.reports.empty') }}
            </td>
          </tr>
          <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex" class="border-t border-border">
            <td
              v-for="(cell, index) in row"
              :key="index"
              class="px-3 py-1.5 whitespace-nowrap"
              :class="table.numeric[index] ? 'text-right tabular-nums' : ''"
            >
              {{ cell.text }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
