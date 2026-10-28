import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { CarrierInvoiceApi, CarrierInvoiceInput } from '../types/carrierInvoice.types'

const BASE = '/planning/carrier-invoices'

export const carrierInvoiceApi = {
  list: () => httpClient.get<SingleResponse<CarrierInvoiceApi[]>>(BASE),
  record: (input: CarrierInvoiceInput) =>
    httpClient.post<SingleResponse<CarrierInvoiceApi>>(BASE, input),
  validate: (no: string, reason: string) =>
    httpClient.post<SingleResponse<CarrierInvoiceApi>>(`${resourcePath(BASE, no)}/validate`, {
      reason
    }),
  refuse: (no: string, reason: string) =>
    httpClient.post<SingleResponse<CarrierInvoiceApi>>(`${resourcePath(BASE, no)}/refuse`, {
      reason
    })
}
