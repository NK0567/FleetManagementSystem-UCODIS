import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import {
  detectPeriodView,
  periodViewFilters,
  type PeriodListView
} from '@/modules/fleet/shared/domain/periodListViews'
import { couplingService } from '../services/couplingService'
import type { CouplingApi, CouplingSearchColumn } from '../types/coupling.types'

export const useCouplingStore = defineStore('fleet-coupling', () => {
  const crud = useCrudState<CouplingApi, CouplingSearchColumn>({
    persistKey: 'fleet-coupling',
    service: couplingService,
    defaultSearchColumn: 'no,tractorPlate,trailerPlate',
    entityLabelKey: 'fleet.couplings.title',
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
