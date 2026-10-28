import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { fleetDashboardService } from '../services/fleetDashboardService'
import type { FleetDashboardApi } from '../types/fleetDashboard.types'

export const useFleetDashboardStore = defineStore('fleet-dashboard', () => {
  const dashboard = ref<FleetDashboardApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDashboard() {
    loading.value = true
    error.value = null
    try {
      dashboard.value = await fleetDashboardService.get()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('fleet.dashboard.loadError'))
    } finally {
      loading.value = false
    }
  }

  return { dashboard, loading, error, fetchDashboard }
})
