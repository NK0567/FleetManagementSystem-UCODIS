import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { PurchaseRequestStatus } from '../domain/purchaseRequest'
import { purchaseRequestService } from '../services/purchaseRequestService'
import type {
  PurchaseRequestApi,
  PurchaseRequestSearchColumn
} from '../types/purchaseRequest.types'

export type PurchaseRequestListView = 'pending' | 'done' | 'all'

const VIEW_STATUSES: Record<PurchaseRequestListView, PurchaseRequestStatus[] | null> = {
  pending: ['requested', 'ordered'],
  done: ['received', 'cancelled'],
  all: null
}

function viewFilters(view: PurchaseRequestListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): PurchaseRequestListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as PurchaseRequestListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const usePurchaseRequestStore = defineStore('maintenance-purchase-request', () => {
  const crud = useCrudState<PurchaseRequestApi, PurchaseRequestSearchColumn>({
    persistKey: 'maintenance-purchase-request',
    service: purchaseRequestService,
    defaultSearchColumn: 'no,label,workOrderNo',
    entityLabelKey: 'maintenance.purchaseRequests.title',
    defaultSortBy: 'requestedAt',
    defaultSortDirection: 'DESC',
    defaultUserFilters: viewFilters('pending')
  })

  const { listView, setListView } = makeViewAsFilters<PurchaseRequestListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
