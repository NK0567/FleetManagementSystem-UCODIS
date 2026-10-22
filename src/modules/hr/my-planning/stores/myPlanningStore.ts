import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { addDays } from '@/utils/date'
import { myPlanningService } from '../services/myPlanningService'
import type { MyPlanningApi } from '../types/myPlanning.types'

export const useMyPlanningStore = defineStore('hr-my-planning', () => {
  const planning = ref<MyPlanningApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Without a date, the server answers with the current week. */
  async function fetchWeek(weekStart?: string) {
    loading.value = true
    error.value = null
    try {
      planning.value = await myPlanningService.get(weekStart)
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('hr.myPlanning.loadError'))
    } finally {
      loading.value = false
    }
  }

  const shiftWeek = (weeks: number) =>
    fetchWeek(planning.value ? addDays(planning.value.weekStart, weeks * 7) : undefined)

  return { planning, loading, error, fetchWeek, shiftWeek }
})
