import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  LoadedQuantity,
  LoadingCheckResult,
  LoadingLineApi,
  ReasonChoice,
  ReturnLineApi
} from '../types/loading.types'

const orders = '/planning/transport-orders'
const linePath = (orderNo: string, lineNo: number, action: string) =>
  `${resourcePath(orders, orderNo)}/lines/${lineNo}/${action}`

export const loadingApi = {
  list: () => httpClient.get<SingleResponse<LoadingLineApi[]>>('/planning/loading'),
  returns: () => httpClient.get<SingleResponse<ReturnLineApi[]>>('/planning/returns'),
  declare: (orderNo: string, lines: LoadedQuantity[]) =>
    httpClient.put<SingleResponse<unknown>>(`${resourcePath(orders, orderNo)}/loading`, { lines }),
  conform: (orderNo: string, lineNo: number) =>
    httpClient.post<SingleResponse<LoadingCheckResult>>(linePath(orderNo, lineNo, 'conform'), {}),
  nonconform: (orderNo: string, lineNo: number, reason: ReasonChoice) =>
    httpClient.post<SingleResponse<LoadingCheckResult>>(
      linePath(orderNo, lineNo, 'nonconform'),
      reason
    ),
  receiveReturn: (
    orderNo: string,
    lineNo: number,
    body: { conforming: boolean } & Partial<ReasonChoice>
  ) => httpClient.post<SingleResponse<unknown>>(linePath(orderNo, lineNo, 'receive-return'), body)
}
