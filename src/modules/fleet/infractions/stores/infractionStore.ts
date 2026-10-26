import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { InfractionStatus } from '../domain/infraction'
import { infractionService } from '../services/infractionService'
import type { InfractionApi, InfractionSearchColumn } from '../types/infraction.types'

export type InfractionListView = 'open' | 'closed' | 'all'

const VIEW_STATUSES: Record<InfractionListView, InfractionStatus[] | null> = {
  open: ['new', 'in_progress'],
  closed: ['closed'],
  all: null
}

function viewFilters(view: InfractionListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): InfractionListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as InfractionListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useInfractionStore = defineStore('fleet-infraction', () => {
  const crud = useCrudState<InfractionApi, InfractionSearchColumn>({
    persistKey: 'fleet-infraction',
    service: infractionService,
    defaultSearchColumn: 'no,vehiclePlate,driverName,location',
    entityLabelKey: 'fleet.infractions.title',
    defaultSortBy: 'occurredAt',
    defaultSortDirection: 'DESC',
    defaultUserFilters: viewFilters('open')
  })

  const { listView, setListView } = makeViewAsFilters<InfractionListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
