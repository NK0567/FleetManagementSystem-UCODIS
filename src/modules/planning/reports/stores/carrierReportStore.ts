import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { planningReportService } from '../services/planningReportService'
import type { CarrierReportRow, ReportPeriod } from '../types/planningReport.types'

export const useCarrierReportStore = defineStore('planning-carrier-report', () => {
  const rows = ref<CarrierReportRow[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRows(period: ReportPeriod) {
    loading.value = true
    error.value = null
    try {
      rows.value = await planningReportService.carriers(period)
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.reports.loadError'))
    } finally {
      loading.value = false
    }
  }

  return { rows, loading, error, fetchRows }
})
