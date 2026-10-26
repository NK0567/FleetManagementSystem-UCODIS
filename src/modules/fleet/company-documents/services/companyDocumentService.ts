import { createCrudService } from '@/core/factories'
import { companyDocumentApi } from '../api/companyDocumentApi'
import type {
  CompanyDocumentApi,
  CompanyDocumentSearchColumn
} from '../types/companyDocument.types'

export const companyDocumentService = {
  ...createCrudService<CompanyDocumentApi, CompanyDocumentSearchColumn>(companyDocumentApi),
  async approve(no: string): Promise<CompanyDocumentApi> {
    return (await companyDocumentApi.approve(no)).data.data
  },
  async reject(no: string, reason: string): Promise<CompanyDocumentApi> {
    return (await companyDocumentApi.reject(no, reason)).data.data
  }
}
