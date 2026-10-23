import { createCrudService } from '@/core/factories'
import { documentTypeApi } from '../api/documentTypeApi'
import type { DocumentTypeApi, DocumentTypeSearchColumn } from '../types/documentType.types'

export const documentTypeService = createCrudService<DocumentTypeApi, DocumentTypeSearchColumn>(
  documentTypeApi
)
