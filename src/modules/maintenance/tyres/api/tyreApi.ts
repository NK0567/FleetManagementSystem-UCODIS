import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { TyreApi, TyrePositionSlot } from '../types/tyre.types'

const basePath = '/maintenance/tyres'

export type TyreAction =
  | 'mount'
  | 'dismount'
  | 'reading'
  | 'rotate'
  | 'retread'
  | 'back-from-retread'
  | 'scrap'

export const tyreApi = {
  ...createCrudApi<TyreApi>({ basePath }),
  positions: (vehicleNo: string) =>
    httpClient.get<SingleResponse<TyrePositionSlot[]>>(`${basePath}/positions`, {
      params: { vehicleNo }
    }),
  act: (no: string, action: TyreAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<TyreApi>>(`${resourcePath(basePath, no)}/${action}`, body)
}
