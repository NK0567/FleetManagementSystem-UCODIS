import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  ActionBody,
  AnsweredLineApi,
  ConfirmationAction,
  ConfirmationLineApi,
  ReceptionAction,
  ReceptionLineApi,
  TrackingApi
} from '../types/confirmation.types'

const orders = '/planning/transport-orders'
const linePath = (orderNo: string, lineNo: number, action: string) =>
  `${resourcePath(orders, orderNo)}/lines/${lineNo}/${action}`

export const confirmationApi = {
  list: () => httpClient.get<SingleResponse<ConfirmationLineApi[]>>('/planning/confirmations'),
  answered: () =>
    httpClient.get<SingleResponse<AnsweredLineApi[]>>('/planning/confirmations/answered'),
  act: (orderNo: string, lineNo: number, action: ConfirmationAction, body: ActionBody = {}) =>
    httpClient.post<SingleResponse<ConfirmationLineApi>>(linePath(orderNo, lineNo, action), body),
  tracking: (token: string) =>
    httpClient.get<SingleResponse<TrackingApi>>(`/public/tracking/${encodeURIComponent(token)}`),
  trackingAnswer: (
    token: string,
    answer:
      | 'confirm'
      | 'unavailable'
      | 'accept-proposal'
      | 'receive-confirm'
      | 'receive-contest'
      | 'refuse'
      | 'satisfaction',
    body: ActionBody = {}
  ) =>
    httpClient.post<SingleResponse<TrackingApi>>(
      `/public/tracking/${encodeURIComponent(token)}/${answer}`,
      body
    ),
  receptions: () => httpClient.get<SingleResponse<ReceptionLineApi[]>>('/planning/receptions'),
  receive: (orderNo: string, lineNo: number, action: ReceptionAction, body: ActionBody) =>
    httpClient.post<SingleResponse<unknown>>(linePath(orderNo, lineNo, action), body)
}
