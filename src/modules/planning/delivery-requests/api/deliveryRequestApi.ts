import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { ImportReport } from '@/core/utils/csvImport'
import type { SingleResponse } from '@/types/api-response.types'
import type { DeliveryRequestApi } from '../types/deliveryRequest.types'

const basePath = '/planning/delivery-requests'

export type DeliveryRequestAction = 'reject' | 'cancel' | 'split' | 'merge' | 'satisfaction'

export const deliveryRequestApi = {
  ...createCrudApi<DeliveryRequestApi>({ basePath }),
  act: (no: string, action: DeliveryRequestAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<DeliveryRequestApi>>(
      `${resourcePath(basePath, no)}/${action}`,
      body
    ),
  importRows: (rows: Record<string, unknown>[]) =>
    httpClient.post<SingleResponse<ImportReport>>(`${basePath}/import`, { rows }),
  syncConnector: () =>
    httpClient.post<SingleResponse<{ received: string[] }>>(`${basePath}/connector/sync`, {}),
  /** The public API external orderers send their orders to (TRS01-US01). */
  sendThroughApi: (body: Record<string, unknown>) =>
    httpClient.post<SingleResponse<{ no: string }>>('/public/orderer-api/orders', body)
}
