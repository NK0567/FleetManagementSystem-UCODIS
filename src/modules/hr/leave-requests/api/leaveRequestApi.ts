import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { LeaveRequestDecision } from '../domain/leaveRequestStatus'
import type { LeaveRequestApi, LeaveRequestSummary } from '../types/leaveRequest.types'

const basePath = '/hr/leave-requests'

export const leaveRequestApi = {
  ...createCrudApi<LeaveRequestApi>({ basePath }),
  decide: (no: string, decision: LeaveRequestDecision, comment: string) =>
    httpClient.post<SingleResponse<LeaveRequestApi>>(`${resourcePath(basePath, no)}/${decision}`, {
      comment
    }),
  summary: () => httpClient.get<SingleResponse<LeaveRequestSummary>>(`${basePath}/summary`)
}
