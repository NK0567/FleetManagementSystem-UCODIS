import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import {
  detectPeriodView,
  periodViewFilters,
  type PeriodListView
} from '@/modules/fleet/shared/domain/periodListViews'
import { driverAssignmentService } from '../services/driverAssignmentService'
import type {
  DriverAssignmentApi,
  DriverAssignmentSearchColumn
} from '../types/driverAssignment.types'

export const useDriverAssignmentStore = defineStore('fleet-driver-assignment', () => {
  const crud = useCrudState<DriverAssignmentApi, DriverAssignmentSearchColumn>({
    persistKey: 'fleet-driver-assignment',
    service: driverAssignmentService,
    defaultSearchColumn: 'no,employeeName,vehiclePlate',
    entityLabelKey: 'fleet.driverAssignments.title',
    defaultSortBy: 'startDate',
    defaultSortDirection: 'DESC',
    defaultUserFilters: periodViewFilters('active')
  })

  const { listView, setListView } = makeViewAsFilters<PeriodListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['state'],
    buildViewFilters: periodViewFilters,
    detect: detectPeriodView
  })

  return { ...crud, listView, setListView }
})
