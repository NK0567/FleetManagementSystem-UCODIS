import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { DepartureDecision } from '../domain/departure'
import { departureAuthorizationService } from '../services/departureAuthorizationService'
import type {
  DepartureAuthorizationApi,
  DepartureAuthorizationSearchColumn
} from '../types/departureAuthorization.types'

export type DepartureAuthorizationListView = DepartureDecision | 'all'

function viewFilters(view: DepartureAuthorizationListView): ListFilter[] {
  return view === 'all' ? [] : [{ field: 'decision', valueType: 'string', value: view }]
}

function detectView(filters: ListFilter[]): DepartureAuthorizationListView {
  const decision = filters.find((filter) => filter.field === 'decision')?.value
  return decision === 'pending' || decision === 'granted' || decision === 'refused'
    ? decision
    : 'all'
}

export const useDepartureAuthorizationStore = defineStore('fleet-departure-authorization', () => {
  const crud = useCrudState<DepartureAuthorizationApi, DepartureAuthorizationSearchColumn>({
    persistKey: 'fleet-departure-authorization',
    service: departureAuthorizationService,
    defaultSearchColumn: 'no,tripNo,vehiclePlate,driverName',
    entityLabelKey: 'fleet.departureAuthorizations.title',
    defaultSortBy: 'plannedDeparture',
    defaultUserFilters: viewFilters('pending')
  })

  const { listView, setListView } = makeViewAsFilters<DepartureAuthorizationListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['decision'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
