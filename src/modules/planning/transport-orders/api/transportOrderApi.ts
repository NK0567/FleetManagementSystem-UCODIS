import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { AvailabilityApi } from '@/modules/fleet/trips'
import type { OrderDebriefing } from '@/modules/planning/closing/domain/closing'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  DebriefingInput,
  TransportOrderApi,
  TransportOrderClosingApi,
  TransportOrderLineInput
} from '../types/transportOrder.types'

const basePath = '/planning/transport-orders'

export type TransportOrderAction = 'plan' | 'cancel'

const orderPath = (no: string) => resourcePath(basePath, no)
const linePath = (no: string, lineNo: number) => `${orderPath(no)}/lines/${lineNo}`

export const transportOrderApi = {
  ...createCrudApi<TransportOrderApi>({ basePath }),
  replaceLines: (no: string, lines: TransportOrderLineInput[], force = false) =>
    httpClient.put<SingleResponse<TransportOrderApi>>(`${orderPath(no)}/lines`, { lines, force }),
  proposedSequence: (no: string) =>
    httpClient.get<SingleResponse<number[]>>(`${orderPath(no)}/proposed-sequence`),
  reorderLines: (no: string, lineNos: number[]) =>
    httpClient.put<SingleResponse<TransportOrderApi>>(`${orderPath(no)}/sequence`, { lineNos }),
  act: (no: string, action: TransportOrderAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<TransportOrderApi>>(`${orderPath(no)}/${action}`, body),
  depart: (no: string) =>
    httpClient.post<SingleResponse<{ status: string }>>(`${orderPath(no)}/depart`, {}),
  declareLine: (no: string, lineNo: number, receivedQuantity: number, justification = '') =>
    httpClient.post<SingleResponse<{ status: string; delivered: boolean }>>(
      `${linePath(no, lineNo)}/declare`,
      { receivedQuantity, justification }
    ),
  handBack: (no: string, lineNo: number) =>
    httpClient.post<SingleResponse<{ handedBack: boolean }>>(
      `${linePath(no, lineNo)}/hand-back`,
      {}
    ),
  remainder: (no: string, lineNo: number, date: string) =>
    httpClient.post<SingleResponse<unknown>>(`${linePath(no, lineNo)}/remainder`, { date }),
  closing: (no: string) =>
    httpClient.get<SingleResponse<TransportOrderClosingApi>>(`${orderPath(no)}/closing`),
  attachDocument: (no: string, kind: string, fileNo: string) =>
    httpClient.post<SingleResponse<{ kind: string; fileNo: string }>>(
      `${orderPath(no)}/documents`,
      { kind, fileNo }
    ),
  saveDebriefing: (no: string, debriefing: DebriefingInput) =>
    httpClient.post<SingleResponse<OrderDebriefing>>(`${orderPath(no)}/debriefing`, debriefing),
  close: (no: string) =>
    httpClient.post<SingleResponse<{ status: string }>>(`${orderPath(no)}/close`, {}),
  availability: (from: string, to: string) =>
    httpClient.get<SingleResponse<AvailabilityApi>>('/fleet/availability', {
      params: { from, to }
    })
}
