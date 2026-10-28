import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { PurchaseRequestApi } from '../types/purchaseRequest.types'

const basePath = '/maintenance/purchase-requests'

export type PurchaseRequestAction = 'order' | 'receive' | 'cancel'

export const purchaseRequestApi = {
  ...createCrudApi<PurchaseRequestApi>({ basePath }),
  act: (no: string, action: PurchaseRequestAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<PurchaseRequestApi>>(
      `${resourcePath(basePath, no)}/${action}`,
      body
    )
}
