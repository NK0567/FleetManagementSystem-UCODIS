import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { TelematicsEventStatus } from '../domain/telematicsEvent'
import { telematicsEventService } from '../services/telematicsEventService'
import type {
  TelematicsEventApi,
  TelematicsEventSearchColumn
} from '../types/telematicsEvent.types'

export type TelematicsEventListView = 'toHandle' | 'handled' | 'all'

const VIEW_STATUSES: Record<TelematicsEventListView, TelematicsEventStatus[] | null> = {
  toHandle: ['new'],
  handled: ['acknowledged', 'infraction'],
  all: null
}

function viewFilters(view: TelematicsEventListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): TelematicsEventListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as TelematicsEventListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useTelematicsEventStore = defineStore('fleet-telematics-event', () => {
  const crud = useCrudState<TelematicsEventApi, TelematicsEventSearchColumn>({
    persistKey: 'fleet-telematics-event',
    service: telematicsEventService,
    defaultSearchColumn: 'no,vehiclePlate,driverName,siteName',
    entityLabelKey: 'fleet.telematicsEvents.title',
    defaultSortBy: 'occurredAt',
    defaultSortDirection: 'DESC',
    defaultUserFilters: viewFilters('toHandle')
  })

  const { listView, setListView } = makeViewAsFilters<TelematicsEventListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
