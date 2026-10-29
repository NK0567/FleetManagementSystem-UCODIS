import { ref } from 'vue'
import { defineStore } from 'pinia'
import httpClient from '@/core/api/httpClient'
import { currentLocale } from '@/core/i18n'
import { dedupeInFlight } from '@/core/utils/inFlightRequests'
import type { ApiResponse } from '@/types/api-response.types'
import type { EnrichOption, OptionsData } from '@/types/options.types'

export const useOptionsStore = defineStore('options', () => {
  const options = ref<OptionsData | null>(null)
  const loading = ref(false)
  const error = ref(false)
  const loadedLanguage = ref<string | null>(null)

  async function fetchOptions(language = currentLocale()): Promise<void> {
    if (loadedLanguage.value === language) return
    return dedupeInFlight(`options:all:${language}`, async () => {
      loading.value = true
      error.value = false
      try {
        const response = await httpClient.get<ApiResponse<OptionsData>>('/options/all', {
          params: { language }
        })
        options.value = response.data.data
        loadedLanguage.value = language
      } catch {
        error.value = true
      } finally {
        loading.value = false
      }
    })
  }

  function getOptions(key: string): EnrichOption[] {
    return options.value?.[key] ?? []
  }

  /** Label of an enumerated value; the raw value when the option set is not loaded. */
  function getOptionLabel(key: string, value: unknown): string {
    if (value == null || value === '') return '-'
    const found = getOptions(key).find((option) => String(option.value) === String(value))
    return found ? found.description : String(value)
  }

  function reset(): void {
    options.value = null
    loadedLanguage.value = null
  }

  return {
    options,
    loading,
    error,
    loadedLanguage,
    fetchOptions,
    getOptions,
    getOptionLabel,
    reset
  }
})
