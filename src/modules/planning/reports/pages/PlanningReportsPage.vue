<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { FileDown, FileSpreadsheet } from '@lucide/vue'
import { usePermissions } from '@/composables/usePermissions'
import { EMPTY_CELL } from '@/utils/format'
import ReportFiltersBar from '../components/ReportFiltersBar.vue'
import ReportTableCard from '../components/ReportTableCard.vue'
import { useReportExport, type ExportFormat } from '../composables/useReportExport'
import { useTransportReportTables } from '../composables/useTransportReportTables'
import { useTransportReportStore } from '../stores/transportReportStore'
import type { ReportFilters } from '../types/planningReport.types'

type Section = 'punctuality' | 'costs' | 'quality' | 'means' | 'carriers'
const SECTIONS: Section[] = ['punctuality', 'costs', 'quality', 'means', 'carriers']

const { t } = useI18n()
const store = useTransportReportStore()
const { report } = storeToRefs(store)
/* The director exports the transport reports (TRS08-US05). */
const { canExport } = usePermissions('TRANSPORTREPORT')

const filters = ref<ReportFilters>({ from: '', to: '', depotNo: '', region: '', ordererNo: '' })
const section = ref<Section>('punctuality')
const choices = computed(() => report.value?.choices ?? null)
const { exporting, exportError, exportAs, subtitle } = useReportExport(filters, choices)
const tables = useTransportReportTables(report)

const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? EMPTY_CELL : `${value} %`

const headline = computed(() => {
  const data = report.value
  if (!data) return []
  return [
    { key: 'orders', value: String(data.orders) },
    { key: 'punctuality', value: percent(data.punctuality.rate) },
    { key: 'confirmed', value: percent(data.quality.rates.confirmed) },
    { key: 'weightRate', value: percent(data.means.averages.weightRate) },
    { key: 'carriers', value: String(data.carriers.length) }
  ]
})

function exportReport(format: ExportFormat) {
  const all = SECTIONS.flatMap((item) => tables[item].value)
  void exportAs(format, t('planning.reports.title'), all)
}

watch(filters, () => void store.fetchReport(filters.value), { deep: true, immediate: true })
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
      <div v-if="canExport" class="flex gap-2">
        <button
          v-for="format in ['xlsx', 'pdf'] as const"
          :key="format"
          type="button"
          class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="store.loading || exporting || !report"
          @click="exportReport(format)"
        >
          <FileSpreadsheet v-if="format === 'xlsx'" class="w-5 h-5 text-primary" />
          <FileDown v-else class="w-5 h-5 text-primary" />
          {{ t(`planning.reports.export.${format}`) }}
        </button>
      </div>
    </header>

    <ReportFiltersBar v-model="filters" :choices="choices" />
    <p class="text-xs text-muted-foreground">{{ subtitle() }}</p>

    <FormAlerts :error="store.error" @clear:error="store.error = null" />
    <FormAlerts :error="exportError" @clear:error="exportError = null" />
    <LoadingBar v-if="store.loading" :height="2" bar-color="var(--color-primary)" />

    <section v-if="report" class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div
        v-for="item in headline"
        :key="item.key"
        class="bg-card border border-border rounded p-4"
      >
        <p class="text-xs text-muted-foreground">
          {{ t(`planning.reports.headline.${item.key}`) }}
        </p>
        <p class="text-2xl font-semibold tabular-nums text-card-foreground">{{ item.value }}</p>
      </div>
    </section>

    <nav class="flex flex-wrap gap-1 border-b border-border">
      <button
        v-for="item in SECTIONS"
        :key="item"
        type="button"
        class="cursor-pointer px-3 py-2 text-sm border-b-2 -mb-px transition"
        :class="
          section === item
            ? 'border-primary text-card-foreground font-medium'
            : 'border-transparent text-muted-foreground hover:text-card-foreground'
        "
        @click="section = item"
      >
        {{ t(`planning.reports.tab.${item}`) }}
      </button>
    </nav>

    <template v-if="report">
      <p class="text-xs text-muted-foreground">
        {{
          t(`planning.reports.hint.${section}`, {
            margin: report.punctuality.marginMin
          })
        }}
      </p>
      <section v-if="section === 'quality'" class="grid gap-3 sm:grid-cols-4">
        <div class="bg-card border border-border rounded p-3">
          <p class="text-xs text-muted-foreground">{{ t('planning.reports.quality.gainCount') }}</p>
          <p class="text-lg font-semibold tabular-nums">
            {{ report.quality.fuelGaps.gainCount }} · {{ report.quality.fuelGaps.gainVolume }} L
          </p>
        </div>
        <div class="bg-card border border-border rounded p-3">
          <p class="text-xs text-muted-foreground">{{ t('planning.reports.quality.lossCount') }}</p>
          <p class="text-lg font-semibold tabular-nums">
            {{ report.quality.fuelGaps.lossCount }} · {{ report.quality.fuelGaps.lossVolume }} L
          </p>
        </div>
        <div class="bg-card border border-border rounded p-3">
          <p class="text-xs text-muted-foreground">
            {{ t('planning.reports.quality.unqualified') }}
          </p>
          <p class="text-lg font-semibold tabular-nums">
            {{ report.quality.fuelGaps.unqualified }}
          </p>
        </div>
      </section>
      <div class="grid gap-3 xl:grid-cols-2">
        <ReportTableCard
          v-for="table in tables[section].value"
          :key="table.title"
          :table="table"
          :class="table.headers.length > 5 ? 'xl:col-span-2' : ''"
        />
      </div>
    </template>
  </div>
</template>
