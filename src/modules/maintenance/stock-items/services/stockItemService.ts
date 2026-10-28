import { createCrudService } from '@/core/factories'
import { stockItemApi } from '../api/stockItemApi'
import type {
  StockItemApi,
  StockItemSearchColumn,
  StockMovementApi
} from '../types/stockItem.types'

export const stockItemService = {
  ...createCrudService<StockItemApi, StockItemSearchColumn>(stockItemApi),
  async movements(no: string): Promise<StockMovementApi[]> {
    return (await stockItemApi.movements(no)).data.data
  },
  async adjust(no: string, delta: number, reason: string): Promise<StockItemApi> {
    return (await stockItemApi.adjust(no, delta, reason)).data.data
  }
}
