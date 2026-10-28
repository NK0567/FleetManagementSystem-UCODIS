import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { loadingService } from '../services/loadingService'
import type {
  LoadedQuantity,
  LoadingLineApi,
  ReasonChoice,
  ReturnLineApi
} from '../types/loading.types'

export const useLoadingStore = defineStore('planning-loading', () => {
  const lines = ref<LoadingLineApi[]>([])
  const returns = ref<ReturnLineApi[]>([])
  const loading = ref(false)
  const acting = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const [toLoad, back] = await Promise.all([loadingService.list(), loadingService.returns()])
      lines.value = toLoad
      returns.value = back
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.loading.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function perform(call: () => Promise<unknown>): Promise<boolean> {
    acting.value = true
    error.value = null
    try {
      await call()
      await fetchAll()
      return true
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.loading.saveError'))
      return false
    } finally {
      acting.value = false
    }
  }

  const declare = (orderNo: string, quantities: LoadedQuantity[]) =>
    perform(() => loadingService.declare(orderNo, quantities))
  const conform = (line: LoadingLineApi) => perform(() => loadingService.conform(line))
  const nonconform = (line: LoadingLineApi, reason: ReasonChoice) =>
    perform(() => loadingService.nonconform(line, reason))
  const receiveReturn = (line: ReturnLineApi) =>
    perform(() => loadingService.receiveReturn(line, null))
  const rejectReturn = (line: ReturnLineApi, reason: ReasonChoice) =>
    perform(() => loadingService.receiveReturn(line, reason))

  return {
    lines,
    returns,
    loading,
    acting,
    error,
    fetchAll,
    declare,
    conform,
    nonconform,
    receiveReturn,
    rejectReturn
  }
})
