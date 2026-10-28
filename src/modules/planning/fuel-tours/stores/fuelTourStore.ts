import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { fuelTourService } from '../services/fuelTourService'
import type { FuelTourApi } from '../types/fuelTour.types'

export const useFuelTourStore = defineStore('planning-fuel-tour', () => {
  const tours = ref<FuelTourApi[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTours() {
    loading.value = true
    error.value = null
    try {
      tours.value = await fuelTourService.list()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.fuelTours.loadError'))
    } finally {
      loading.value = false
    }
  }

  return { tours, loading, error, fetchTours }
})
