import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { alertService } from '../services/alertService'
import type { AlertApi, AlertSearchColumn } from '../types/alert.types'

export type AlertListView = 'current' | 'escalated' | 'history' | 'all'

const VIEW_FILTERS: Record<AlertListView, ListFilter[]> = {
  current: [{ field: 'status', valueType: 'string', value: ['new', 'acknowledged'] }],
  escalated: [{ field: 'escalated', valueType: 'boolean', value: true }],
  history: [{ field: 'status', valueType: 'string', value: ['handled', 'resolved'] }],
  all: []
}

function detectView(filters: ListFilter[]): AlertListView {
  const managed = JSON.stringify(
    filters.filter((filter) => filter.field === 'status' || filter.field === 'escalated')
  )
  const match = (Object.keys(VIEW_FILTERS) as AlertListView[]).find(
    (view) => JSON.stringify(VIEW_FILTERS[view]) === managed
  )
  return match ?? 'all'
}

export const useAlertStore = defineStore('fleet-alert', () => {
  const crud = useCrudState<AlertApi, AlertSearchColumn>({
    persistKey: 'fleet-alert',
    service: alertService,
    defaultSearchColumn: 'subject,detail',
    entityLabelKey: 'fleet.alerts.title',
    defaultSortBy: 'since',
    defaultUserFilters: VIEW_FILTERS.current
  })

  const { listView, setListView } = makeViewAsFilters<AlertListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status', 'escalated'],
    buildViewFilters: (view) => VIEW_FILTERS[view],
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
