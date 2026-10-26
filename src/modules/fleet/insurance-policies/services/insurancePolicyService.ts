import { createCrudService } from '@/core/factories'
import { insurancePolicyApi } from '../api/insurancePolicyApi'
import type {
  InsurancePolicyApi,
  InsurancePolicySearchColumn
} from '../types/insurancePolicy.types'

export const insurancePolicyService = {
  ...createCrudService<InsurancePolicyApi, InsurancePolicySearchColumn>(insurancePolicyApi),
  async terminate(no: string, terminatedOn: string, reason: string): Promise<InsurancePolicyApi> {
    return (await insurancePolicyApi.terminate(no, terminatedOn, reason)).data.data
  }
}
