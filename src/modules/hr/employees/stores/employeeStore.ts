import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { employeeService } from '../services/employeeService'
import type { EmployeeApi, EmployeeSearchColumn, EmployeeStatus } from '../types/employee.types'

export type EmployeeListView = 'onStaff' | 'left' | 'all'

const VIEW_STATUSES: Record<Exclude<EmployeeListView, 'all'>, EmployeeStatus[]> = {
  onStaff: ['active', 'on_leave', 'suspended'],
  left: ['contract_ended', 'archived']
}

function viewFilters(view: EmployeeListView): ListFilter[] {
  return view === 'all'
    ? []
    : [{ field: 'status', valueType: 'string', value: VIEW_STATUSES[view] }]
}

function detectView(filters: ListFilter[]): EmployeeListView {
  const status = filters.find((filter) => filter.field === 'status')
  const value = JSON.stringify(status?.value)
  if (value === JSON.stringify(VIEW_STATUSES.onStaff)) return 'onStaff'
  if (value === JSON.stringify(VIEW_STATUSES.left)) return 'left'
  return 'all'
}

export const useEmployeeStore = defineStore('hr-employee', () => {
  const crud = useCrudState<EmployeeApi, EmployeeSearchColumn>({
    persistKey: 'hr-employee',
    service: employeeService,
    defaultSearchColumn: 'no,fullName,nationalId,phone',
    entityLabelKey: 'hr.employees.title',
    defaultSortBy: 'no'
  })

  const { listView, setListView } = makeViewAsFilters<EmployeeListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
