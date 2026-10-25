import { createCrudService } from '@/core/factories'
import { mobileInterventionApi, type MobileInterventionAction } from '../api/mobileInterventionApi'
import type {
  MobileInterventionApi,
  MobileInterventionSearchColumn,
  MobileTeamSummary
} from '../types/mobileIntervention.types'

export const mobileInterventionService = {
  ...createCrudService<MobileInterventionApi, MobileInterventionSearchColumn>(
    mobileInterventionApi
  ),
  async summary(month: string): Promise<MobileTeamSummary> {
    return (await mobileInterventionApi.summary(month)).data.data
  },
  async act(
    no: string,
    action: MobileInterventionAction,
    body: Record<string, unknown> = {}
  ): Promise<MobileInterventionApi> {
    return (await mobileInterventionApi.act(no, action, body)).data.data
  }
}
