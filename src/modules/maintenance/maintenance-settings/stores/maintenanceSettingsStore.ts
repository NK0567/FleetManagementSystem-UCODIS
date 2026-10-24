import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import type { MaintenanceSettings, MaintenanceSettingsSection } from '../domain/maintenanceSettings'
import { maintenanceSettingsService } from '../services/maintenanceSettingsService'
import type { MaintenanceSettingsApi } from '../types/maintenanceSettings.types'

/** A single record, edited one section at a time. */
export const useMaintenanceSettingsStore = defineStore('maintenance-settings', () => {
  const settings = ref<MaintenanceSettingsApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const savingSection = ref<MaintenanceSettingsSection | null>(null)
  const saveError = ref<string | null>(null)

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      settings.value = await maintenanceSettingsService.get()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('maintenance.settings.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function saveSection<S extends MaintenanceSettingsSection>(
    section: S,
    values: MaintenanceSettings[S]
  ): Promise<boolean> {
    savingSection.value = section
    saveError.value = null
    try {
      settings.value = await maintenanceSettingsService.updateSection(section, values)
      return true
    } catch (cause) {
      saveError.value = apiErrorMessage(cause, i18n.global.t('maintenance.settings.saveError'))
      return false
    } finally {
      savingSection.value = null
    }
  }

  return { settings, loading, error, savingSection, saveError, fetchSettings, saveSection }
})
