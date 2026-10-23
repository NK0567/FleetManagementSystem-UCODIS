import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { PolicyState } from '../domain/insurancePolicy'
import { insurancePolicyService } from '../services/insurancePolicyService'
import type {
  InsurancePolicyApi,
  InsurancePolicySearchColumn
} from '../types/insurancePolicy.types'

export type InsurancePolicyListView = 'inForce' | 'toRenew' | 'all'

const VIEW_STATES: Record<InsurancePolicyListView, PolicyState[] | null> = {
  inForce: ['upcoming', 'active', 'expiring'],
  toRenew: ['expiring'],
  all: null
}

function viewFilters(view: InsurancePolicyListView): ListFilter[] {
  const states = VIEW_STATES[view]
  return states ? [{ field: 'state', valueType: 'string', value: states }] : []
}

function detectView(filters: ListFilter[]): InsurancePolicyListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'state')?.value ?? null)
  const match = (Object.keys(VIEW_STATES) as InsurancePolicyListView[]).find(
    (view) => JSON.stringify(VIEW_STATES[view]) === value
  )
  return match ?? 'all'
}

export const useInsurancePolicyStore = defineStore('fleet-insurance-policy', () => {
  const crud = useCrudState<InsurancePolicyApi, InsurancePolicySearchColumn>({
    persistKey: 'fleet-insurance-policy',
    service: insurancePolicyService,
    defaultSearchColumn: 'no,policyNumber,vehiclePlate,insurerName',
    entityLabelKey: 'fleet.insurancePolicies.title',
    defaultSortBy: 'endDate',
    defaultUserFilters: viewFilters('inForce')
  })

  const { listView, setListView } = makeViewAsFilters<InsurancePolicyListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['state'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
