import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { workshopLoadService } from '../services/workshopLoadService'
import type { WorkshopLoadApi } from '../types/workshopLoad.types'

export const useWorkshopLoadStore = defineStore('maintenance-workshop-load', () => {
  const load = ref<WorkshopLoadApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLoad() {
    loading.value = true
    error.value = null
    try {
      load.value = await workshopLoadService.get()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('maintenance.workshopLoad.loadError'))
    } finally {
      loading.value = false
    }
  }

  return { load, loading, error, fetchLoad }
})
