import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { FuelCardTransactionApi } from '../types/fuelCardTransaction.types'

const basePath = '/fleet/fuel-card-transactions'
type Response = SingleResponse<FuelCardTransactionApi>

export const fuelCardTransactionApi = {
  ...createCrudApi<FuelCardTransactionApi>({ basePath }),
  matchAll: () => httpClient.post<SingleResponse<{ matched: number }>>(`${basePath}/match-all`),
  match: (no: string, refillNo: string) =>
    httpClient.post<Response>(`${resourcePath(basePath, no)}/match`, { refillNo }),
  detach: (no: string) => httpClient.post<Response>(`${resourcePath(basePath, no)}/detach`),
  createRefill: (no: string, odometerKm: number, fullTank: boolean) =>
    httpClient.post<Response>(`${resourcePath(basePath, no)}/refill`, { odometerKm, fullTank })
}
