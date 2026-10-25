import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { addDays, todayIso } from '@/utils/date'
import { reliabilityService } from '../services/reliabilityService'
import type { MaintenanceDashboardApi, ReliabilityApi } from '../types/reliability.types'

export const useReliabilityStore = defineStore('maintenance-reliability', () => {
  const to = ref(todayIso())
  const from = ref(addDays(to.value, -364))
  const reliability = ref<ReliabilityApi | null>(null)
  const dashboard = ref<MaintenanceDashboardApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run(load: () => Promise<void>) {
    loading.value = true
    error.value = null
    try {
      await load()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('maintenance.reliability.loadError'))
    } finally {
      loading.value = false
    }
  }

  const fetchReliability = () =>
    run(async () => {
      reliability.value = await reliabilityService.get(from.value, to.value)
    })

  const fetchDashboard = () =>
    run(async () => {
      dashboard.value = await reliabilityService.dashboard()
    })

  return { from, to, reliability, dashboard, loading, error, fetchReliability, fetchDashboard }
})
