import { customerBillingApi } from '../api/customerBillingApi'
import type { BillRow, InvoiceResult } from '../types/customerBilling.types'

export const customerBillingService = {
  async list(): Promise<BillRow[]> {
    return (await customerBillingApi.list()).data.data
  },
  async invoice(orderNo: string, lineNo: number, reference: string): Promise<InvoiceResult> {
    return (await customerBillingApi.invoice(orderNo, lineNo, reference)).data.data
  }
}
