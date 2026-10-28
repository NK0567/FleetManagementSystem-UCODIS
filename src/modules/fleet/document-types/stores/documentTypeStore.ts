import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { documentTypeService } from '../services/documentTypeService'
import type { DocumentTypeApi, DocumentTypeSearchColumn } from '../types/documentType.types'

export const useDocumentTypeStore = defineStore('fleet-document-type', () => {
  const crud = useCrudState<DocumentTypeApi, DocumentTypeSearchColumn>({
    persistKey: 'fleet-document-type',
    service: documentTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.documentTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
