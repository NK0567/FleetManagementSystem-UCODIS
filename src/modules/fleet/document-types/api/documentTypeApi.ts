import { createCrudApi } from '@/core/factories'
import type { DocumentTypeApi } from '../types/documentType.types'

export const documentTypeApi = createCrudApi<DocumentTypeApi>({
  basePath: '/fleet/document-types'
})
