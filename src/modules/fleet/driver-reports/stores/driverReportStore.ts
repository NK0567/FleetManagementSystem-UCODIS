import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { DriverReportStatus } from '../domain/driverReport'
import { driverReportService } from '../services/driverReportService'
import type { DriverReportApi, DriverReportSearchColumn } from '../types/driverReport.types'

export type DriverReportListView = 'pending' | 'closed' | 'all'

const VIEW_STATUSES: Record<DriverReportListView, DriverReportStatus[] | null> = {
  pending: ['open', 'in_progress'],
  closed: ['closed'],
  all: null
}

function viewFilters(view: DriverReportListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): DriverReportListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as DriverReportListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useDriverReportStore = defineStore('fleet-driver-report', () => {
  const crud = useCrudState<DriverReportApi, DriverReportSearchColumn>({
    persistKey: 'fleet-driver-report',
    service: driverReportService,
    defaultSearchColumn: 'no,employeeName,subject',
    entityLabelKey: 'fleet.driverReports.title',
    defaultSortBy: 'reportedOn',
    defaultUserFilters: viewFilters('pending')
  })

  const { listView, setListView } = makeViewAsFilters<DriverReportListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
