import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { StockStatus } from '../domain/stock'
import { stockItemService } from '../services/stockItemService'
import type { StockItemApi, StockItemSearchColumn } from '../types/stockItem.types'

export type StockItemListView = 'toReorder' | 'all'

const VIEW_STATUSES: Record<StockItemListView, StockStatus[] | null> = {
  toReorder: ['low', 'out'],
  all: null
}

function viewFilters(view: StockItemListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): StockItemListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  return value === JSON.stringify(VIEW_STATUSES.toReorder) ? 'toReorder' : 'all'
}

export const useStockItemStore = defineStore('maintenance-stock-item', () => {
  const crud = useCrudState<StockItemApi, StockItemSearchColumn>({
    persistKey: 'maintenance-stock-item',
    service: stockItemService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'maintenance.stockItems.title',
    defaultSortBy: 'no'
  })

  const { listView, setListView } = makeViewAsFilters<StockItemListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
