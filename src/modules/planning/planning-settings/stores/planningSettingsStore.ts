import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import type { PlanningSettings, PlanningSettingsSection } from '../domain/planningSettings'
import { planningSettingsService } from '../services/planningSettingsService'
import type { PlanningSettingsApi } from '../types/planningSettings.types'

/** A single record, edited one section at a time. */
export const usePlanningSettingsStore = defineStore('planning-settings', () => {
  const settings = ref<PlanningSettingsApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const savingSection = ref<PlanningSettingsSection | null>(null)
  const saveError = ref<string | null>(null)

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      settings.value = await planningSettingsService.get()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.settings.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function saveSection<S extends PlanningSettingsSection>(
    section: S,
    values: PlanningSettings[S]
  ): Promise<boolean> {
    savingSection.value = section
    saveError.value = null
    try {
      settings.value = await planningSettingsService.updateSection(section, values)
      return true
    } catch (cause) {
      saveError.value = apiErrorMessage(cause, i18n.global.t('planning.settings.saveError'))
      return false
    } finally {
      savingSection.value = null
    }
  }

  return { settings, loading, error, savingSection, saveError, fetchSettings, saveSection }
})
