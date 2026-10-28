import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { missingDocumentService } from '../services/documentService'
import type { MissingDocumentApi, MissingDocumentSearchColumn } from '../types/document.types'

export const useMissingDocumentStore = defineStore('fleet-missing-document', () => {
  const crud = useCrudState<MissingDocumentApi, MissingDocumentSearchColumn>({
    persistKey: 'fleet-missing-document',
    service: missingDocumentService,
    defaultSearchColumn: 'subjectName,documentTypeName',
    entityLabelKey: 'fleet.missingDocuments.title',
    defaultSortBy: 'subjectName'
  })

  return { ...crud }
})
