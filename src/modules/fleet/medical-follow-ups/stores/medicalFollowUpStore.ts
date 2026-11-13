import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { MedicalFollowUpStatus } from '../domain/medicalFollowUp'
import { medicalFollowUpService } from '../services/medicalFollowUpService'
import type {
  MedicalFollowUpApi,
  MedicalFollowUpSearchColumn
} from '../types/medicalFollowUp.types'

export type MedicalFollowUpListView = 'attention' | 'compliant' | 'all'

const VIEW_STATUSES: Record<MedicalFollowUpListView, MedicalFollowUpStatus[] | null> = {
  attention: ['non_compliant', 'pending'],
  compliant: ['compliant'],
  all: null
}

function viewFilters(view: MedicalFollowUpListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): MedicalFollowUpListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as MedicalFollowUpListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useMedicalFollowUpStore = defineStore('fleet-medical-follow-up', () => {
  const crud = useCrudState<MedicalFollowUpApi, MedicalFollowUpSearchColumn>({
    persistKey: 'fleet-medical-follow-up',
    service: medicalFollowUpService,
    defaultSearchColumn: 'no,employeeName,provider',
    entityLabelKey: 'fleet.medicalFollowUps.title',
    defaultSortBy: 'nextDueOn',
    defaultUserFilters: viewFilters('attention')
  })

  const { listView, setListView } = makeViewAsFilters<MedicalFollowUpListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
