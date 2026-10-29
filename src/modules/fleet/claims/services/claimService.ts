import { createCrudService } from '@/core/factories'
import type { TrainingApi } from '@/modules/fleet/trainings'
import { claimApi, type InsuranceStep } from '../api/claimApi'
import type { ClaimApi, ClaimSearchColumn, ClaimSummaryApi } from '../types/claim.types'

export const claimService = {
  ...createCrudService<ClaimApi, ClaimSearchColumn>(claimApi),
  async summary(): Promise<ClaimSummaryApi> {
    return (await claimApi.summary()).data.data
  },
  async insurance(no: string, step: InsuranceStep): Promise<ClaimApi> {
    return (await claimApi.insurance(no, step)).data.data
  },
  async training(no: string, topic: string): Promise<TrainingApi> {
    return (await claimApi.training(no, topic)).data.data
  },
  async close(no: string): Promise<ClaimApi> {
    return (await claimApi.close(no)).data.data
  }
}
