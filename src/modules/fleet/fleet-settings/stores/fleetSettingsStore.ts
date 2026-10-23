import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import type { FleetSettings, FleetSettingsSection } from '../domain/fleetSettings'
import { fleetSettingsService } from '../services/fleetSettingsService'
import type { FleetSettingsApi } from '../types/fleetSettings.types'

/** A single record, edited one section at a time. */
export const useFleetSettingsStore = defineStore('fleet-settings', () => {
  const settings = ref<FleetSettingsApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const savingSection = ref<FleetSettingsSection | null>(null)
  const saveError = ref<string | null>(null)

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      settings.value = await fleetSettingsService.get()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('fleet.settings.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function saveSection<S extends FleetSettingsSection>(
    section: S,
    values: FleetSettings[S]
  ): Promise<boolean> {
    savingSection.value = section
    saveError.value = null
    try {
      settings.value = await fleetSettingsService.updateSection(section, values)
      return true
    } catch (cause) {
      saveError.value = apiErrorMessage(cause, i18n.global.t('fleet.settings.saveError'))
      return false
    } finally {
      savingSection.value = null
    }
  }

  return { settings, loading, error, savingSection, saveError, fetchSettings, saveSection }
})
