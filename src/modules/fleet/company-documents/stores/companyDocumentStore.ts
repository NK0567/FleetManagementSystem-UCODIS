import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { companyDocumentService } from '../services/companyDocumentService'
import type {
  CompanyDocumentApi,
  CompanyDocumentSearchColumn
} from '../types/companyDocument.types'

export type CompanyDocumentListView = 'current' | 'toReview' | 'all'

const VIEW_FILTERS: Record<CompanyDocumentListView, ListFilter[]> = {
  current: [{ field: 'current', valueType: 'boolean', value: true }],
  toReview: [{ field: 'status', valueType: 'string', value: 'pending' }],
  all: []
}

function detectView(filters: ListFilter[]): CompanyDocumentListView {
  if (filters.some((filter) => filter.field === 'current' && filter.value === true)) {
    return 'current'
  }
  if (filters.some((filter) => filter.field === 'status' && filter.value === 'pending')) {
    return 'toReview'
  }
  return 'all'
}

export const useCompanyDocumentStore = defineStore('fleet-company-document', () => {
  const crud = useCrudState<CompanyDocumentApi, CompanyDocumentSearchColumn>({
    persistKey: 'fleet-company-document',
    service: companyDocumentService,
    defaultSearchColumn: 'no,name,documentTypeName,keywordText',
    entityLabelKey: 'fleet.companyDocuments.title',
    defaultSortBy: 'name',
    defaultUserFilters: VIEW_FILTERS.current
  })

  const { listView, setListView } = makeViewAsFilters<CompanyDocumentListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['current', 'status'],
    buildViewFilters: (view) => VIEW_FILTERS[view],
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
