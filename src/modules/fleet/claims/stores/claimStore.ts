import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { claimService } from '../services/claimService'
import type { ClaimApi, ClaimSearchColumn } from '../types/claim.types'

export type ClaimListView = 'open' | 'closed' | 'all'

function viewFilters(view: ClaimListView): ListFilter[] {
  return view === 'all' ? [] : [{ field: 'status', valueType: 'string', value: view }]
}

function detectView(filters: ListFilter[]): ClaimListView {
  const status = filters.find((filter) => filter.field === 'status')?.value
  return status === 'open' || status === 'closed' ? status : 'all'
}

export const useClaimStore = defineStore('fleet-claim', () => {
  const crud = useCrudState<ClaimApi, ClaimSearchColumn>({
    persistKey: 'fleet-claim',
    service: claimService,
    defaultSearchColumn: 'no,vehiclePlate,driverName,location',
    entityLabelKey: 'fleet.claims.title',
    defaultSortBy: 'occurredAt',
    defaultSortDirection: 'DESC',
    defaultUserFilters: viewFilters('open')
  })

  const { listView, setListView } = makeViewAsFilters<ClaimListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
