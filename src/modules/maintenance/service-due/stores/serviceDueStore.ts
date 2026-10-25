import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { ServiceDueStatus } from '../domain/serviceDue'
import { serviceDueService } from '../services/serviceDueService'
import type { ServiceDueApi, ServiceDueSearchColumn } from '../types/serviceDue.types'

export type ServiceDueListView = 'toPlan' | 'unknown' | 'all'

const VIEW_STATUSES: Record<ServiceDueListView, ServiceDueStatus[] | null> = {
  toPlan: ['due_soon', 'overdue', 'blocking'],
  unknown: ['unknown'],
  all: null
}

function viewFilters(view: ServiceDueListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): ServiceDueListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as ServiceDueListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useServiceDueStore = defineStore('maintenance-service-due', () => {
  const crud = useCrudState<ServiceDueApi, ServiceDueSearchColumn>({
    persistKey: 'maintenance-service-due',
    service: serviceDueService,
    defaultSearchColumn: 'vehiclePlate,operationLabel,planName',
    entityLabelKey: 'maintenance.serviceDue.title',
    defaultSortBy: 'kmRemaining',
    defaultSortDirection: 'ASC',
    defaultUserFilters: viewFilters('toPlan')
  })

  const { listView, setListView } = makeViewAsFilters<ServiceDueListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
