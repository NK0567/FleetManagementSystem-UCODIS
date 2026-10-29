import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { stockMovementService } from '../services/stockItemService'
import type { StockMovementApi, StockMovementSearchColumn } from '../types/stockItem.types'

export const useStockMovementStore = defineStore('maintenance-stock-movement', () =>
  useCrudState<StockMovementApi, StockMovementSearchColumn>({
    persistKey: 'maintenance-stock-movement',
    service: stockMovementService,
    defaultSearchColumn: 'itemNo,itemName,workOrderNo,reason',
    entityLabelKey: 'maintenance.stockMovements.title',
    defaultSortBy: 'at',
    defaultSortDirection: 'DESC'
  })
)
