import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  ActionBody,
  ConfirmationAction,
  ConfirmationLineApi,
  ReceptionAction,
  ReceptionLineApi
} from '../types/confirmation.types'

const orders = '/planning/transport-orders'
const linePath = (orderNo: string, lineNo: number, action: string) =>
  `${resourcePath(orders, orderNo)}/lines/${lineNo}/${action}`

export const confirmationApi = {
  list: () => httpClient.get<SingleResponse<ConfirmationLineApi[]>>('/planning/confirmations'),
  act: (orderNo: string, lineNo: number, action: ConfirmationAction, body: ActionBody = {}) =>
    httpClient.post<SingleResponse<ConfirmationLineApi>>(linePath(orderNo, lineNo, action), body),
  receptions: () => httpClient.get<SingleResponse<ReceptionLineApi[]>>('/planning/receptions'),
  receive: (orderNo: string, lineNo: number, action: ReceptionAction, body: ActionBody) =>
    httpClient.post<SingleResponse<unknown>>(linePath(orderNo, lineNo, action), body)
}
