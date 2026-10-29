import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { planningReportService } from '../services/planningReportService'
import type { PlanningDashboardApi, ReportFilters } from '../types/planningReport.types'

export const usePlanningDashboardStore = defineStore('planning-dashboard', () => {
  const dashboard = ref<PlanningDashboardApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDashboard(filters: ReportFilters) {
    loading.value = true
    error.value = null
    try {
      dashboard.value = await planningReportService.dashboard(filters)
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.dashboard.loadError'))
    } finally {
      loading.value = false
    }
  }

  return { dashboard, loading, error, fetchDashboard }
})
