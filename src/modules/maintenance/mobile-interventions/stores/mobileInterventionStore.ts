import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { MobileInterventionStatus } from '../domain/mobileIntervention'
import { mobileInterventionService } from '../services/mobileInterventionService'
import type {
  MobileInterventionApi,
  MobileInterventionSearchColumn
} from '../types/mobileIntervention.types'

export type MobileInterventionListView = 'inProgress' | 'closed' | 'all'

const VIEW_STATUSES: Record<MobileInterventionListView, MobileInterventionStatus[] | null> = {
  inProgress: ['en_route', 'on_site'],
  closed: ['resolved', 'unresolved'],
  all: null
}

function viewFilters(view: MobileInterventionListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): MobileInterventionListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as MobileInterventionListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useMobileInterventionStore = defineStore('maintenance-mobile-intervention', () => {
  const crud = useCrudState<MobileInterventionApi, MobileInterventionSearchColumn>({
    persistKey: 'maintenance-mobile-intervention',
    service: mobileInterventionService,
    defaultSearchColumn: 'no,vehiclePlate,location',
    entityLabelKey: 'maintenance.mobileInterventions.title',
    defaultSortBy: 'departedAt',
    defaultSortDirection: 'DESC'
  })

  const { listView, setListView } = makeViewAsFilters<MobileInterventionListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
