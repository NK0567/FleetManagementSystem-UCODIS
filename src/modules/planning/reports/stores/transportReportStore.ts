import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { planningReportService } from '../services/planningReportService'
import type { ReportFilters, TransportReportApi } from '../types/planningReport.types'

export const useTransportReportStore = defineStore('planning-transport-report', () => {
  const report = ref<TransportReportApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchReport(filters: ReportFilters) {
    loading.value = true
    error.value = null
    try {
      report.value = await planningReportService.transport(filters)
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.reports.loadError'))
    } finally {
      loading.value = false
    }
  }

  return { report, loading, error, fetchReport }
})
