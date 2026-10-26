import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { ImportReport } from '@/core/utils/csvImport'
import type { SingleResponse } from '@/types/api-response.types'
import type { DeliveryRequestApi } from '../types/deliveryRequest.types'

const basePath = '/planning/delivery-requests'

export type DeliveryRequestAction = 'reject' | 'cancel' | 'split' | 'merge'

export const deliveryRequestApi = {
  ...createCrudApi<DeliveryRequestApi>({ basePath }),
  act: (no: string, action: DeliveryRequestAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<DeliveryRequestApi>>(
      `${resourcePath(basePath, no)}/${action}`,
      body
    ),
  importRows: (rows: Record<string, unknown>[]) =>
    httpClient.post<SingleResponse<ImportReport>>(`${basePath}/import`, { rows })
}
