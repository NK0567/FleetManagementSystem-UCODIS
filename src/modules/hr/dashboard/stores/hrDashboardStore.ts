import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { hrDashboardService } from '../services/hrDashboardService'
import type { HrDashboardApi } from '../types/hrDashboard.types'

export const useHrDashboardStore = defineStore('hr-dashboard', () => {
  const dashboard = ref<HrDashboardApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDashboard() {
    loading.value = true
    error.value = null
    try {
      dashboard.value = await hrDashboardService.get()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('hr.dashboard.loadError'))
    } finally {
      loading.value = false
    }
  }

  return { dashboard, loading, error, fetchDashboard }
})
