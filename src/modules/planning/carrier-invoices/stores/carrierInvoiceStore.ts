import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { carrierInvoiceService } from '../services/carrierInvoiceService'
import type { CarrierInvoiceApi, CarrierInvoiceInput } from '../types/carrierInvoice.types'

export const useCarrierInvoiceStore = defineStore('planning-carrier-invoice', () => {
  const invoices = ref<CarrierInvoiceApi[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchInvoices() {
    loading.value = true
    error.value = null
    try {
      invoices.value = await carrierInvoiceService.list()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.carrierInvoices.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      await action()
      await fetchInvoices()
      return true
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.carrierInvoices.saveError'))
      return false
    } finally {
      saving.value = false
    }
  }

  const record = (input: CarrierInvoiceInput) => run(() => carrierInvoiceService.record(input))
  const validate = (no: string, reason: string) =>
    run(() => carrierInvoiceService.validate(no, reason))
  const refuse = (no: string, reason: string) => run(() => carrierInvoiceService.refuse(no, reason))

  return { invoices, loading, saving, error, fetchInvoices, record, validate, refuse }
})
