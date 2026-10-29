import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { MyChecklistInput, MyOrderApi, MyProfileApi, MyTourApi } from '../types/mySpace.types'

export const mySpaceApi = {
  profile: () => httpClient.get<SingleResponse<MyProfileApi>>('/me'),
  tour: () => httpClient.get<SingleResponse<MyTourApi | null>>('/me/tour'),
  orders: () => httpClient.get<SingleResponse<MyOrderApi[]>>('/me/orders'),
  check: (orderNo: string, body: Record<string, unknown>) =>
    httpClient.post<SingleResponse<unknown>>(
      `/me/orders/${encodeURIComponent(orderNo)}/check`,
      body
    ),
  lineAction: (
    orderNo: string,
    lineNo: number,
    action: 'arrive' | 'declare' | 'postpone' | 'refuse',
    body: Record<string, unknown> = {}
  ) =>
    httpClient.post<SingleResponse<unknown>>(
      `/me/orders/${encodeURIComponent(orderNo)}/lines/${lineNo}/${action}`,
      body
    ),
  saveChecklist: (input: MyChecklistInput) =>
    httpClient.post<SingleResponse<unknown>>('/me/checklist', { stage: 'departure', ...input })
}
