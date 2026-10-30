<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileDown, FileSpreadsheet } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import PrimaryActionButton from '@/modules/fleet/shared/components/PrimaryActionButton.vue'
import { todayIso } from '@/utils/date'
import { formatDate } from '@/utils/format'
import { useReportFormat } from '../composables/useReportFormat'
import { exportReportPdf, exportReportXlsx } from '../services/reportExport'
import { fleetReportService } from '../services/fleetReportService'
import {
  REPORT_COMPARISONS,
  REPORT_KINDS,
  type FleetReportApi,
  type ReportComparison,
  type ReportFilters,
  type ReportKind
} from '../types/fleetReport.types'

const { t } = useI18n()
const { toTable } = useReportFormat()
const { canExport } = usePermissions('FLEETREPORT')

const today = todayIso()
const kind = ref<ReportKind>('summary')
const filters = ref<ReportFilters>({
  from: `${today.slice(0, 7)}-01`,
  to: today,
  siteNo: null,
  compare: null,
  compareFrom: '',
  compareTo: '',
  compareSiteNo: null,
  groupBy: 'week'
})
const report = ref<FleetReportApi | null>(null)
const loading = ref(false)
const exporting = ref(false)
const error = ref<string | null>(null)

const periodInvalid = computed(
  () => !filters.value.from || !filters.value.to || filters.value.from > filters.value.to
)
/** A comparison with another period waits for both of its dates. */
const comparisonIncomplete = computed(
  () =>
    kind.value === 'summary' &&
    filters.value.compare === 'period' &&
    (!filters.value.compareFrom ||
      !filters.value.compareTo ||
      filters.value.compareFrom > filters.value.compareTo)
)
const sameSites = computed(
  () =>
    kind.value === 'summary' &&
    filters.value.compare === 'site' &&
    (filters.value.compareSiteNo ?? null) === (filters.value.siteNo ?? null)
)

async function load() {
  if (periodInvalid.value || comparisonIncomplete.value) return
  loading.value = true
  error.value = null
  try {
    report.value = await fleetReportService.get(kind.value, {
      ...filters.value,
      // The comparison belongs to the summary only.
      compare: kind.value === 'summary' ? filters.value.compare : null
    })
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.reports.loadError'))
  } finally {
    loading.value = false
  }
}

watch([kind, filters], load, { deep: true, immediate: true })

function setCompare(value: string) {
  filters.value.compare = (value || null) as ReportComparison | null
}

const tables = computed(() =>
  report.value ? report.value.sections.map((section) => toTable(report.value!.kind, section)) : []
)

const periodText = (from: string, to: string) =>
  t('fleet.reports.period', { from: formatDate(from), to: formatDate(to) })

const subtitle = computed(() => {
  if (!report.value) return ''
  const main = [
    periodText(report.value.from, report.value.to),
    report.value.siteName || t('fleet.reports.allSites')
  ].join(' · ')
  const other = report.value.comparison
  if (!other) return main
  const compared = [
    periodText(other.from, other.to),
    other.siteName || t('fleet.reports.allSites')
  ].join(' · ')
  return t('fleet.reports.comparedWith', { main, other: compared })
})

const fileName = computed(() =>
  report.value
    ? `${t(`fleet.reports.kind.${report.value.kind}`)} ${report.value.from} ${report.value.to}`
    : ''
)

/** Why the report cannot be exported yet, shown on hover. */
const exportBlocked = computed(() =>
  periodInvalid.value || comparisonIncomplete.value || !report.value
    ? t('fleet.reports.exportBlocked')
    : undefined
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
      <div v-if="canExport" class="flex gap-2">
        <PrimaryActionButton
          :label="t('fleet.reports.export.xlsx')"
          :icon="FileSpreadsheet"
          :disabled="loading || exporting"
          :disabled-reason="exportBlocked"
          @click="exportAs('xlsx')"
        />
        <button
          type="button"
          class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="loading || exporting || !!exportBlocked"
          :title="exportBlocked"
          @click="exportAs('pdf')"
        >
          <FileDown class="w-4 h-4 text-primary" />
          {{ t('fleet.reports.export.pdf') }}
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

    <section class="flex flex-wrap items-end gap-3">
      <BaseFormField :label="t('fleet.reports.filter.from')" class="w-44">
        <DateFormInput v-model="filters.from" />
      </BaseFormField>
      <BaseFormField :label="t('fleet.reports.filter.to')" class="w-44">
        <DateFormInput v-model="filters.to" />
      </BaseFormField>
      <BaseFormField :label="t('fleet.reports.filter.site')" class="w-60">
        <ReferenceLookup
          :model-value="filters.siteNo ?? ''"
          reference-key="sites"
          :modal-title="t('fleet.reports.filter.site')"
          @update:model-value="filters.siteNo = $event ? String($event) : null"
        />
      </BaseFormField>
      <template v-if="kind === 'summary'">
        <BaseFormField :label="t('fleet.reports.filter.compare')" class="w-56">
          <select
            :value="filters.compare ?? ''"
            class="w-full h-9 px-2 border border-border rounded text-sm bg-card"
            :aria-label="t('fleet.reports.filter.compare')"
            @change="setCompare(($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ t('fleet.reports.compare.none') }}</option>
            <option v-for="value in REPORT_COMPARISONS" :key="value" :value="value">
              {{ t(`fleet.reports.compare.${value}`) }}
            </option>
          </select>
        </BaseFormField>
        <template v-if="filters.compare === 'period'">
          <BaseFormField :label="t('fleet.reports.filter.compareFrom')" class="w-44">
            <DateFormInput v-model="filters.compareFrom" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.reports.filter.compareTo')" class="w-44">
            <DateFormInput v-model="filters.compareTo" />
          </BaseFormField>
        </template>
        <BaseFormField
          v-if="filters.compare === 'site'"
          :label="t('fleet.reports.filter.compareSite')"
          class="w-60"
        >
          <ReferenceLookup
            :model-value="filters.compareSiteNo ?? ''"
            reference-key="sites"
            :modal-title="t('fleet.reports.filter.compareSite')"
            @update:model-value="filters.compareSiteNo = $event ? String($event) : null"
          />
        </BaseFormField>
      </template>
      <BaseFormField
        v-if="kind === 'drivers'"
        :label="t('fleet.reports.filter.groupBy')"
        class="w-44"
      >
        <select
          v-model="filters.groupBy"
          class="w-full h-9 px-2 border border-border rounded text-sm bg-card"
          :aria-label="t('fleet.reports.filter.groupBy')"
        >
          <option value="day">{{ t('fleet.reports.groupBy.day') }}</option>
          <option value="week">{{ t('fleet.reports.groupBy.week') }}</option>
        </select>
      </BaseFormField>
    </section>
    <p v-if="periodInvalid" class="text-sm text-destructive">
      {{ t('fleet.reports.periodInvalid') }}
    </p>
    <p v-else-if="comparisonIncomplete" class="text-sm text-destructive">
      {{ t('fleet.reports.comparisonIncomplete') }}
    </p>
    <p v-else-if="sameSites" class="text-sm text-muted-foreground">
      {{ t('fleet.reports.sameSites') }}
    </p>

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
