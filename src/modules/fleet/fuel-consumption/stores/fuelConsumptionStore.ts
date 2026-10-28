import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { FuelGapStatus } from '../domain/consumption'
import { fuelConsumptionService } from '../services/fuelConsumptionService'
import type {
  FuelConsumptionApi,
  FuelConsumptionSearchColumn
} from '../types/fuelConsumption.types'

export type FuelConsumptionListView = 'gaps' | 'toDecide' | 'all'

const VIEW_STATUSES: Record<FuelConsumptionListView, FuelGapStatus[] | null> = {
  gaps: ['to_qualify', 'qualified'],
  toDecide: ['deduction_proposed'],
  all: null
}

function viewFilters(view: FuelConsumptionListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): FuelConsumptionListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as FuelConsumptionListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useFuelConsumptionStore = defineStore('fleet-fuel-consumption', () => {
  const crud = useCrudState<FuelConsumptionApi, FuelConsumptionSearchColumn>({
    persistKey: 'fleet-fuel-consumption',
    service: fuelConsumptionService,
    defaultSearchColumn: 'vehiclePlate,driverName',
    entityLabelKey: 'fleet.fuelConsumption.title',
    defaultSortBy: 'to',
    defaultSortDirection: 'DESC'
  })

  const { listView, setListView } = makeViewAsFilters<FuelConsumptionListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
