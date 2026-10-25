import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { tyreService } from '../services/tyreService'
import type { TyreApi, TyreSearchColumn } from '../types/tyre.types'

export type TyreListView = 'mounted' | 'stock' | 'alerts' | 'all'

const VIEW_FILTERS: Record<TyreListView, ListFilter[]> = {
  mounted: [{ field: 'status', valueType: 'string', value: ['mounted'] }],
  stock: [{ field: 'status', valueType: 'string', value: ['stock'] }],
  alerts: [{ field: 'alert', valueType: 'string', value: ['safety', 'rotation'] }],
  all: []
}

function detectView(filters: ListFilter[]): TyreListView {
  const managed = JSON.stringify(
    filters.filter((filter) => filter.field === 'status' || filter.field === 'alert')
  )
  const match = (Object.keys(VIEW_FILTERS) as TyreListView[]).find(
    (view) => JSON.stringify(VIEW_FILTERS[view]) === managed
  )
  return match ?? 'all'
}

export const useTyreStore = defineStore('maintenance-tyre', () => {
  const crud = useCrudState<TyreApi, TyreSearchColumn>({
    persistKey: 'maintenance-tyre',
    service: tyreService,
    defaultSearchColumn: 'no,serialNumber,make,vehiclePlate',
    entityLabelKey: 'maintenance.tyres.title',
    defaultSortBy: 'no'
  })

  const { listView, setListView } = makeViewAsFilters<TyreListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status', 'alert'],
    buildViewFilters: (view) => VIEW_FILTERS[view],
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
