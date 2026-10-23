import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { fuelRefillService } from '../services/fuelRefillService'
import type { FuelRefillApi, FuelRefillSearchColumn } from '../types/fuelRefill.types'

export type FuelRefillListView = 'all' | 'anomaly'

function viewFilters(view: FuelRefillListView): ListFilter[] {
  return view === 'anomaly' ? [{ field: 'status', valueType: 'string', value: 'anomaly' }] : []
}

function detectView(filters: ListFilter[]): FuelRefillListView {
  return filters.some((filter) => filter.field === 'status' && filter.value === 'anomaly')
    ? 'anomaly'
    : 'all'
}

export const useFuelRefillStore = defineStore('fleet-fuel-refill', () => {
  const crud = useCrudState<FuelRefillApi, FuelRefillSearchColumn>({
    persistKey: 'fleet-fuel-refill',
    service: fuelRefillService,
    defaultSearchColumn: 'no,vehiclePlate,driverName,stationLabel',
    entityLabelKey: 'fleet.fuelRefills.title',
    defaultSortBy: 'refueledAt',
    defaultSortDirection: 'DESC'
  })

  const { listView, setListView } = makeViewAsFilters<FuelRefillListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
