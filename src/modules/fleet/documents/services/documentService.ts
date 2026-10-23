import { createCrudService } from '@/core/factories'
import { documentApi, missingDocumentApi } from '../api/documentApi'
import type { DeclaredStatus } from '../domain/document'
import type {
  DocumentApi,
  DocumentSearchColumn,
  MissingDocumentApi,
  MissingDocumentSearchColumn
} from '../types/document.types'

export const documentService = {
  ...createCrudService<DocumentApi, DocumentSearchColumn>(documentApi),
  async declare(no: string, status: DeclaredStatus, reason: string): Promise<DocumentApi> {
    return (await documentApi.declare(no, status, reason)).data.data
  }
}

export const missingDocumentService = createCrudService<
  MissingDocumentApi,
  MissingDocumentSearchColumn
>(missingDocumentApi)
