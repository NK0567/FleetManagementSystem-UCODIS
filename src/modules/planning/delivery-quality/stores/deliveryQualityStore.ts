import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { deliveryQualityService } from '../services/deliveryQualityService'
import type {
  ProtestInput,
  QualityRowApi,
  ResponsibilityInput
} from '../types/deliveryQuality.types'

export const useDeliveryQualityStore = defineStore('planning-delivery-quality', () => {
  const rows = ref<QualityRowApi[]>([])
  const loading = ref(false)
  const acting = ref(false)
  const error = ref<string | null>(null)

  async function fetchRows() {
    loading.value = true
    error.value = null
    try {
      rows.value = await deliveryQualityService.list()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.quality.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function perform(call: () => Promise<unknown>): Promise<boolean> {
    acting.value = true
    error.value = null
    try {
      await call()
      await fetchRows()
      return true
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.quality.saveError'))
      return false
    } finally {
      acting.value = false
    }
  }

  const prepareProtest = (row: QualityRowApi, body: ProtestInput) =>
    perform(() => deliveryQualityService.prepareProtest(row, body))
  const issueProtest = (row: QualityRowApi, protestNo: string) =>
    perform(() => deliveryQualityService.issueProtest(row, protestNo))
  const closeProtest = (row: QualityRowApi, protestNo: string, outcome: string) =>
    perform(() => deliveryQualityService.closeProtest(row, protestNo, outcome))
  const setResponsibility = (row: QualityRowApi, body: ResponsibilityInput) =>
    perform(() => deliveryQualityService.setResponsibility(row, body))
  const issueCredit = (row: QualityRowApi, reference: string) =>
    perform(() => deliveryQualityService.issueCredit(row, reference))

  return {
    rows,
    loading,
    acting,
    error,
    fetchRows,
    prepareProtest,
    issueProtest,
    closeProtest,
    setResponsibility,
    issueCredit
  }
})
