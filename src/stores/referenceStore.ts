import { ref } from 'vue'
import { defineStore } from 'pinia'
import httpClient from '@/core/api/httpClient'
import { dedupeInFlight } from '@/core/utils/inFlightRequests'
import type { ApiResponse } from '@/types/api-response.types'
import type { ReferenceData, ReferenceItem } from '@/types/reference.types'

export const useReferenceStore = defineStore('reference', () => {
  const data = ref<ReferenceData | null>(null)
  const loading = ref(false)
  const error = ref(false)

  async function refresh(): Promise<void> {
    return dedupeInFlight('reference:all', async () => {
      loading.value = true
      error.value = false
      try {
        const response = await httpClient.get<ApiResponse<ReferenceData>>('/reference/all')
        data.value = response.data.data
      } catch {
        error.value = true
      } finally {
        loading.value = false
      }
    })
  }

  async function fetchAll(): Promise<void> {
    if (!data.value) await refresh()
  }

  function getItems(key: string): ReferenceItem[] {
    return data.value?.[key] ?? []
  }

  function getLabel(key: string, code: string | null | undefined): string {
    if (!code) return '—'
    return getItems(key).find((item) => item.code === code)?.description ?? code
  }

  function reset(): void {
    data.value = null
  }

  return { data, loading, error, fetchAll, refresh, getItems, getLabel, reset }
})
