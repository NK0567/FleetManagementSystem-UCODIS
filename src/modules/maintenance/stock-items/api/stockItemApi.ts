import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  StockItemApi,
  StockMovementApi,
  StockSummaryApi,
  SupplierSupplyApi
} from '../types/stockItem.types'

const basePath = '/maintenance/stock-items'

/** Every movement of the store, all items together. */
export const stockMovementApi = createCrudApi<StockMovementApi>({
  basePath: '/maintenance/stock-movements'
})

export const stockItemApi = {
  ...createCrudApi<StockItemApi>({ basePath }),
  supply: (supplierNo: string) =>
    httpClient.get<SingleResponse<SupplierSupplyApi>>(
      `/maintenance/suppliers/${encodeURIComponent(supplierNo)}/supply`
    ),
  summary: () => httpClient.get<SingleResponse<StockSummaryApi>>(`${basePath}/summary`),
  movements: (no: string) =>
    httpClient.get<SingleResponse<StockMovementApi[]>>(`${resourcePath(basePath, no)}/movements`),
  adjust: (no: string, delta: number, reason: string) =>
    httpClient.post<SingleResponse<StockItemApi>>(`${resourcePath(basePath, no)}/adjust`, {
      delta,
      reason
    })
}
