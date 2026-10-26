import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { DocumentState } from '../domain/document'
import { documentService } from '../services/documentService'
import type { DocumentApi, DocumentSearchColumn } from '../types/document.types'

export type DocumentListView = 'toRenew' | 'current' | 'all'

const TO_RENEW: DocumentState[] = ['expiring', 'expired', 'cancelled', 'lost']
const CURRENT: ListFilter = { field: 'current', valueType: 'boolean', value: true }

function viewFilters(view: DocumentListView): ListFilter[] {
  if (view === 'all') return []
  if (view === 'current') return [CURRENT]
  return [CURRENT, { field: 'state', valueType: 'string', value: TO_RENEW }]
}

function detectView(filters: ListFilter[]): DocumentListView {
  const current = filters.some((filter) => filter.field === 'current' && filter.value === true)
  const state = filters.find((filter) => filter.field === 'state')?.value
  if (current && JSON.stringify(state) === JSON.stringify(TO_RENEW)) return 'toRenew'
  if (current && state === undefined) return 'current'
  return 'all'
}

export const useDocumentStore = defineStore('fleet-document', () => {
  const crud = useCrudState<DocumentApi, DocumentSearchColumn>({
    persistKey: 'fleet-document',
    service: documentService,
    defaultSearchColumn: 'no,subjectName,number',
    entityLabelKey: 'fleet.documents.title',
    defaultSortBy: 'expiryDate',
    defaultUserFilters: viewFilters('current')
  })

  const { listView, setListView } = makeViewAsFilters<DocumentListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['current', 'state'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
