import { carrierInvoiceApi } from '../api/carrierInvoiceApi'
import type { CarrierInvoiceApi, CarrierInvoiceInput } from '../types/carrierInvoice.types'

export const carrierInvoiceService = {
  async list(): Promise<CarrierInvoiceApi[]> {
    return (await carrierInvoiceApi.list()).data.data
  },
  async record(input: CarrierInvoiceInput): Promise<CarrierInvoiceApi> {
    return (await carrierInvoiceApi.record(input)).data.data
  },
  async validate(no: string, reason: string): Promise<CarrierInvoiceApi> {
    return (await carrierInvoiceApi.validate(no, reason)).data.data
  },
  async refuse(no: string, reason: string): Promise<CarrierInvoiceApi> {
    return (await carrierInvoiceApi.refuse(no, reason)).data.data
  }
}
