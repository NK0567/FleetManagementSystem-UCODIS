import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { vehicleService } from '../services/vehicleService'
import type { VehicleApi, VehicleSearchColumn, VehicleStatus } from '../types/vehicle.types'

export type VehicleListView = 'fleet' | 'removed' | 'all'

const IN_FLEET: VehicleStatus[] = [
  'available',
  'assigned',
  'in_mission',
  'in_maintenance',
  'immobilized',
  'out_of_service'
]

function viewFilters(view: VehicleListView): ListFilter[] {
  if (view === 'all') return []
  const value = view === 'fleet' ? IN_FLEET : ['removed']
  return [{ field: 'status', valueType: 'string', value }]
}

function detectView(filters: ListFilter[]): VehicleListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value)
  if (value === JSON.stringify(IN_FLEET)) return 'fleet'
  if (value === JSON.stringify(['removed'])) return 'removed'
  return 'all'
}

export const useVehicleStore = defineStore('fleet-vehicle', () => {
  const crud = useCrudState<VehicleApi, VehicleSearchColumn>({
    persistKey: 'fleet-vehicle',
    service: vehicleService,
    defaultSearchColumn: 'no,plate,vin,formerPlates',
    entityLabelKey: 'fleet.vehicles.title',
    defaultSortBy: 'no',
    defaultUserFilters: viewFilters('fleet')
  })

  const { listView, setListView } = makeViewAsFilters<VehicleListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
