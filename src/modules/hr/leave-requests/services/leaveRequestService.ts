import { createCrudService } from '@/core/factories'
import { leaveRequestApi } from '../api/leaveRequestApi'
import type { LeaveRequestDecision } from '../domain/leaveRequestStatus'
import type {
  LeaveRequestApi,
  LeaveRequestSearchColumn,
  LeaveRequestSummary
} from '../types/leaveRequest.types'

export const leaveRequestService = {
  ...createCrudService<LeaveRequestApi, LeaveRequestSearchColumn>(leaveRequestApi),
  async decide(
    no: string,
    decision: LeaveRequestDecision,
    comment: string
  ): Promise<LeaveRequestApi> {
    return (await leaveRequestApi.decide(no, decision, comment)).data.data
  },
  async summary(): Promise<LeaveRequestSummary> {
    return (await leaveRequestApi.summary()).data.data
  }
}
