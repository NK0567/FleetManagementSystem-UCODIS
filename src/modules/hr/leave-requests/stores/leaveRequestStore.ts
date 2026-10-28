import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { useUserStore } from '@/stores/user'
import type { LeaveRequestStatus } from '../domain/leaveRequestStatus'
import { leaveRequestService } from '../services/leaveRequestService'
import type { LeaveRequestApi, LeaveRequestSearchColumn } from '../types/leaveRequest.types'

export type LeaveRequestListView = 'pending' | 'decided' | 'all'

const VIEW_STATUSES: Record<Exclude<LeaveRequestListView, 'all'>, LeaveRequestStatus[]> = {
  pending: ['pending'],
  decided: ['approved', 'sent_back', 'rejected']
}

function viewFilters(view: LeaveRequestListView): ListFilter[] {
  return view === 'all'
    ? []
    : [{ field: 'status', valueType: 'string', value: VIEW_STATUSES[view] }]
}

function detectView(filters: ListFilter[]): LeaveRequestListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value)
  if (value === JSON.stringify(VIEW_STATUSES.pending)) return 'pending'
  if (value === JSON.stringify(VIEW_STATUSES.decided)) return 'decided'
  return 'all'
}

export const useLeaveRequestStore = defineStore('hr-leave-request', () => {
  const crud = useCrudState<LeaveRequestApi, LeaveRequestSearchColumn>({
    persistKey: 'hr-leave-request',
    service: leaveRequestService,
    defaultSearchColumn: 'no,employeeName',
    entityLabelKey: 'hr.leaveRequests.title',
    defaultSortBy: 'submittedAt',
    defaultSortDirection: 'DESC',
    listAccessScope: {
      feature: 'LEAVEREQUEST',
      ownerField: 'employeeNo',
      ownerValue: () => useUserStore().user?.employeeNo ?? ''
    }
  })

  const { listView, setListView } = makeViewAsFilters<LeaveRequestListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
