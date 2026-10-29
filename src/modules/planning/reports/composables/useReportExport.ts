import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import type { ReportTable } from '@/modules/fleet/reports/composables/useReportFormat'
import { exportReportPdf, exportReportXlsx } from '@/modules/fleet/reports/services/reportExport'
import { EMPTY_CELL, formatDate } from '@/utils/format'
import type { ReportChoices, ReportFilters } from '../types/planningReport.types'

export type ExportFormat = 'xlsx' | 'pdf'

/** A cell as the tables and the exports show it; Excel keeps the number. */
export function cellOf(text: string, value: string | number | null = text) {
  return { text, value }
}

/**
 * Exports the tables shown, on the chosen period and filters (TRS08-US05). The subtitle names
 * the filters so that a shared or archived file says what it covers.
 */
export function useReportExport(filters: Ref<ReportFilters>, choices: Ref<ReportChoices | null>) {
  const { t } = useI18n()
  const exporting = ref(false)
  const exportError = ref<string | null>(null)

  function subtitle(): string {
    const { from, to, depotNo, region, ordererNo } = filters.value
    const parts = [
      !from && !to
        ? t('planning.reports.allPeriods')
        : t('planning.reports.period', {
            from: from ? formatDate(from) : EMPTY_CELL,
            to: to ? formatDate(to) : EMPTY_CELL
          })
    ]
    const depot = choices.value?.depots.find((item) => item.no === depotNo)
    const orderer = choices.value?.orderers.find((item) => item.no === ordererNo)
    if (depotNo) parts.push(`${t('planning.reports.filter.depot')} : ${depot?.name ?? depotNo}`)
    if (region) parts.push(`${t('planning.reports.filter.region')} : ${region}`)
    if (ordererNo)
      parts.push(`${t('planning.reports.filter.orderer')} : ${orderer?.name ?? ordererNo}`)
    return parts.join(' · ')
  }

  async function exportAs(format: ExportFormat, title: string, tables: ReportTable[]) {
    exporting.value = true
    exportError.value = null
    const fileName = `${title} ${filters.value.from} ${filters.value.to}`.trim()
    try {
      if (format === 'xlsx') await exportReportXlsx(tables, fileName)
      else
        await exportReportPdf(
          { title, subtitle: subtitle() },
          tables,
          fileName,
          t('planning.reports.noData')
        )
    } catch (cause) {
      exportError.value = apiErrorMessage(cause, t('planning.reports.exportError'))
    } finally {
      exporting.value = false
    }
  }

  return { exporting, exportError, exportAs, subtitle }
}
