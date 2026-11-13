import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { TripDebriefStatus } from '../domain/tripDebrief'
import { tripDebriefService } from '../services/tripDebriefService'
import type { TripDebriefApi, TripDebriefSearchColumn } from '../types/tripDebrief.types'

export type TripDebriefListView = 'open' | 'closed' | 'all'

const VIEW_STATUSES: Record<TripDebriefListView, TripDebriefStatus[] | null> = {
  open: ['draft', 'partly_signed', 'signed'],
  closed: ['closed'],
  all: null
}

function viewFilters(view: TripDebriefListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): TripDebriefListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as TripDebriefListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useTripDebriefStore = defineStore('fleet-trip-debrief', () => {
  const crud = useCrudState<TripDebriefApi, TripDebriefSearchColumn>({
    persistKey: 'fleet-trip-debrief',
    service: tripDebriefService,
    defaultSearchColumn: 'no,voucherNo,employeeName,vehiclePlate',
    entityLabelKey: 'fleet.tripDebriefs.title',
    defaultSortBy: 'unloadedOn',
    defaultUserFilters: viewFilters('open')
  })

  const { listView, setListView } = makeViewAsFilters<TripDebriefListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
