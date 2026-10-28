import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { BillRow, InvoiceResult } from '../types/customerBilling.types'

export const customerBillingApi = {
  list: () => httpClient.get<SingleResponse<BillRow[]>>('/planning/customer-billing'),
  invoice: (orderNo: string, lineNo: number, reference: string) =>
    httpClient.post<SingleResponse<InvoiceResult>>(
      `${resourcePath('/planning/transport-orders', orderNo)}/lines/${lineNo}/invoice`,
      { reference }
    )
}
