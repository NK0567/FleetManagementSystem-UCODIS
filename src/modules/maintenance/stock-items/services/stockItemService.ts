import { createCrudService } from '@/core/factories'
import { stockItemApi, stockMovementApi } from '../api/stockItemApi'
import type {
  StockItemApi,
  StockItemSearchColumn,
  StockMovementApi,
  StockMovementSearchColumn,
  StockSummaryApi,
  SupplierSupplyApi
} from '../types/stockItem.types'

export const stockMovementService = createCrudService<StockMovementApi, StockMovementSearchColumn>(
  stockMovementApi
)

export const stockItemService = {
  ...createCrudService<StockItemApi, StockItemSearchColumn>(stockItemApi),
  async supply(supplierNo: string): Promise<SupplierSupplyApi> {
    return (await stockItemApi.supply(supplierNo)).data.data
  },
  async summary(): Promise<StockSummaryApi> {
    return (await stockItemApi.summary()).data.data
  },
  async movements(no: string): Promise<StockMovementApi[]> {
    return (await stockItemApi.movements(no)).data.data
  },
  async adjust(no: string, delta: number, reason: string): Promise<StockItemApi> {
    return (await stockItemApi.adjust(no, delta, reason)).data.data
  }
}
