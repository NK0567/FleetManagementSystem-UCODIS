import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { ConfirmationState } from '../domain/confirmation'

const orders = '/planning/transport-orders'

export interface ConfirmationLineApi {
  orderNo: string
  lineNo: number
  deliveryPointName: string
  recipientName: string
  productName: string
  quantity: number
  unit: string
  state: ConfirmationState
  clientProposedOn: string | null
  plannerProposedOn: string | null
  availableOn: string | null
  trackingToken: string | null
  trackingExpiresOn: string | null
}

export const confirmationApi = {
  list: () => httpClient.get<SingleResponse<ConfirmationLineApi[]>>('/planning/confirmations'),
  act: (orderNo: string, lineNo: number, action: string, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<ConfirmationLineApi>>(
      `${resourcePath(orders, orderNo)}/lines/${lineNo}/${action}`,
      body
    )
}
