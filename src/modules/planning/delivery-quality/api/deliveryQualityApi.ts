import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { ResponsibilityImpact } from '../domain/quality'
import type {
  ProtestInput,
  QualityRowApi,
  ResponsibilityInput
} from '../types/deliveryQuality.types'

const linePath = (orderNo: string, lineNo: number, action: string) =>
  `${resourcePath('/planning/transport-orders', orderNo)}/lines/${lineNo}/${action}`

export const deliveryQualityApi = {
  list: () => httpClient.get<SingleResponse<QualityRowApi[]>>('/planning/delivery-quality'),
  prepareProtest: (orderNo: string, lineNo: number, body: ProtestInput) =>
    httpClient.post<SingleResponse<{ no: string }>>(linePath(orderNo, lineNo, 'protests'), body),
  issueProtest: (orderNo: string, lineNo: number, protestNo: string) =>
    httpClient.post<SingleResponse<{ status: string }>>(
      linePath(orderNo, lineNo, `protests/${encodeURIComponent(protestNo)}/issue`),
      {}
    ),
  attachProtestFile: (orderNo: string, lineNo: number, protestNo: string, fileNo: string) =>
    httpClient.post<SingleResponse<{ fileNos: string[] }>>(
      linePath(orderNo, lineNo, `protests/${encodeURIComponent(protestNo)}/files`),
      { fileNo }
    ),
  closeProtest: (orderNo: string, lineNo: number, protestNo: string, outcome: string) =>
    httpClient.post<SingleResponse<{ status: string }>>(
      linePath(orderNo, lineNo, `protests/${encodeURIComponent(protestNo)}/close`),
      { outcome }
    ),
  setResponsibility: (orderNo: string, lineNo: number, body: ResponsibilityInput) =>
    httpClient.post<SingleResponse<{ impacts: ResponsibilityImpact[] }>>(
      linePath(orderNo, lineNo, 'responsibility'),
      body
    ),
  issueCredit: (orderNo: string, lineNo: number, reference: string) =>
    httpClient.post<SingleResponse<{ reference: string }>>(
      linePath(orderNo, lineNo, 'issue-credit'),
      { reference }
    )
}
