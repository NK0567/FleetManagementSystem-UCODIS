import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { fuelCardTransactionService } from '../services/fuelCardTransactionService'
import type {
  FuelCardTransactionApi,
  FuelCardTransactionSearchColumn
} from '../types/fuelCardTransaction.types'

export type FuelCardTransactionListView = 'unmatched' | 'overruns' | 'all'

const VIEW_FILTERS: Record<FuelCardTransactionListView, ListFilter[]> = {
  unmatched: [{ field: 'matched', valueType: 'boolean', value: false }],
  overruns: [{ field: 'overrunCount', valueType: 'number', operator: '>', value: 0 }],
  all: []
}

function detectView(filters: ListFilter[]): FuelCardTransactionListView {
  if (filters.some((filter) => filter.field === 'matched')) return 'unmatched'
  if (filters.some((filter) => filter.field === 'overrunCount')) return 'overruns'
  return 'all'
}

export const useFuelCardTransactionStore = defineStore('fleet-fuel-card-transaction', () => {
  const crud = useCrudState<FuelCardTransactionApi, FuelCardTransactionSearchColumn>({
    persistKey: 'fleet-fuel-card-transaction',
    service: fuelCardTransactionService,
    defaultSearchColumn: 'no,cardNumber,station,city',
    entityLabelKey: 'fleet.fuelCardTransactions.title',
    defaultSortBy: 'transactedAt',
    defaultSortDirection: 'DESC'
  })

  const { listView, setListView } = makeViewAsFilters<FuelCardTransactionListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['matched', 'overrunCount'],
    buildViewFilters: (view) => VIEW_FILTERS[view],
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
