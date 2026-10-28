import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { DeviationNature } from '../domain/routeDeviation'
import { routeDeviationService } from '../services/routeDeviationService'
import type { RouteDeviationApi, RouteDeviationSearchColumn } from '../types/routeDeviation.types'

export type RouteDeviationListView = 'toQualify' | 'qualified' | 'all'

const VIEW_NATURES: Record<RouteDeviationListView, DeviationNature[] | null> = {
  toQualify: ['to_qualify'],
  qualified: ['authorized', 'endured', 'unjustified'],
  all: null
}

function viewFilters(view: RouteDeviationListView): ListFilter[] {
  const natures = VIEW_NATURES[view]
  return natures ? [{ field: 'nature', valueType: 'string', value: natures }] : []
}

function detectView(filters: ListFilter[]): RouteDeviationListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'nature')?.value ?? null)
  const match = (Object.keys(VIEW_NATURES) as RouteDeviationListView[]).find(
    (view) => JSON.stringify(VIEW_NATURES[view]) === value
  )
  return match ?? 'all'
}

export const useRouteDeviationStore = defineStore('fleet-route-deviation', () => {
  const crud = useCrudState<RouteDeviationApi, RouteDeviationSearchColumn>({
    persistKey: 'fleet-route-deviation',
    service: routeDeviationService,
    defaultSearchColumn: 'no,tripNo,vehiclePlate,driverName',
    entityLabelKey: 'fleet.routeDeviations.title',
    defaultSortBy: 'detectedAt',
    defaultSortDirection: 'DESC',
    defaultUserFilters: viewFilters('toQualify')
  })

  const { listView, setListView } = makeViewAsFilters<RouteDeviationListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['nature'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
