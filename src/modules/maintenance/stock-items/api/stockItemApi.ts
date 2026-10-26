import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { StockItemApi, StockMovementApi } from '../types/stockItem.types'

const basePath = '/maintenance/stock-items'

export const stockItemApi = {
  ...createCrudApi<StockItemApi>({ basePath }),
  movements: (no: string) =>
    httpClient.get<SingleResponse<StockMovementApi[]>>(`${resourcePath(basePath, no)}/movements`),
  adjust: (no: string, delta: number, reason: string) =>
    httpClient.post<SingleResponse<StockItemApi>>(`${resourcePath(basePath, no)}/adjust`, {
      delta,
      reason
    })
}
