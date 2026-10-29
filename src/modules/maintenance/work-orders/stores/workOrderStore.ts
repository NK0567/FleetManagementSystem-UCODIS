import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { WorkOrderStatus } from '../domain/workOrder'
import { workOrderService } from '../services/workOrderService'
import type { WorkOrderApi, WorkOrderSearchColumn } from '../types/workOrder.types'

export type WorkOrderListView =
  | 'active'
  | 'awaiting_parts'
  | 'external'
  | 'to_validate'
  | 'finished'
  | 'all'

const VIEW_STATUSES: Record<WorkOrderListView, WorkOrderStatus[] | null> = {
  active: ['open', 'diagnosed', 'in_progress', 'awaiting_parts'],
  awaiting_parts: ['awaiting_parts'],
  external: null,
  to_validate: ['awaiting_validation'],
  finished: ['closed', 'cancelled'],
  all: null
}

const EXTERNAL_FIELD = 'atExternalWorkshop'

function viewFilters(view: WorkOrderListView): ListFilter[] {
  if (view === 'external') return [{ field: EXTERNAL_FIELD, valueType: 'boolean', value: true }]
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): WorkOrderListView {
  const external = filters.find((filter) => filter.field === EXTERNAL_FIELD)
  if (external && String(external.value) === 'true') {
    return filters.some((filter) => filter.field === 'status') ? 'all' : 'external'
  }
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as WorkOrderListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useWorkOrderStore = defineStore('maintenance-work-order', () => {
  const crud = useCrudState<WorkOrderApi, WorkOrderSearchColumn>({
    persistKey: 'maintenance-work-order',
    service: workOrderService,
    defaultSearchColumn: 'no,vehiclePlate,symptom,providerName',
    entityLabelKey: 'maintenance.workOrders.title',
    defaultSortBy: 'declaredAt',
    defaultSortDirection: 'DESC',
    defaultUserFilters: viewFilters('active')
  })

  const { listView, setListView } = makeViewAsFilters<WorkOrderListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status', EXTERNAL_FIELD],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
