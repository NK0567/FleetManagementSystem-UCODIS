import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { TripStatus } from '../domain/trip'
import { tripService } from '../services/tripService'
import type { TripApi, TripSearchColumn } from '../types/trip.types'

export type TripListView = 'open' | 'done' | 'all'

const VIEW_STATUSES: Record<Exclude<TripListView, 'all'>, TripStatus[]> = {
  open: ['planned', 'in_progress', 'completed'],
  done: ['closed', 'cancelled']
}

function viewFilters(view: TripListView): ListFilter[] {
  return view === 'all'
    ? []
    : [{ field: 'status', valueType: 'string', value: VIEW_STATUSES[view] }]
}

function detectView(filters: ListFilter[]): TripListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value)
  if (value === JSON.stringify(VIEW_STATUSES.open)) return 'open'
  if (value === JSON.stringify(VIEW_STATUSES.done)) return 'done'
  return 'all'
}

export const useTripStore = defineStore('fleet-trip', () => {
  const crud = useCrudState<TripApi, TripSearchColumn>({
    persistKey: 'fleet-trip',
    service: tripService,
    defaultSearchColumn: 'no,vehiclePlate,driverName',
    entityLabelKey: 'fleet.trips.title',
    defaultSortBy: 'plannedDeparture',
    defaultSortDirection: 'DESC',
    defaultUserFilters: viewFilters('open')
  })

  const { listView, setListView } = makeViewAsFilters<TripListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
