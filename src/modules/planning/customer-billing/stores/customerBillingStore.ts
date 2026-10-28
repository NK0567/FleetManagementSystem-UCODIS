import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { customerBillingService } from '../services/customerBillingService'
import type { BillRow } from '../types/customerBilling.types'

export const useCustomerBillingStore = defineStore('planning-customer-billing', () => {
  const rows = ref<BillRow[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchRows() {
    loading.value = true
    error.value = null
    try {
      rows.value = await customerBillingService.list()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.billing.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function invoice(row: BillRow, reference: string): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      await customerBillingService.invoice(row.orderNo, row.lineNo, reference)
      await fetchRows()
      return true
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.billing.saveError'))
      return false
    } finally {
      saving.value = false
    }
  }

  return { rows, loading, saving, error, fetchRows, invoice }
})
