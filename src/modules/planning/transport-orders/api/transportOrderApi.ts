import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { AvailabilityApi } from '@/modules/fleet/trips'
import type { SingleResponse } from '@/types/api-response.types'
import type { TransportOrderApi, TransportOrderLineInput } from '../types/transportOrder.types'

const basePath = '/planning/transport-orders'

export type TransportOrderAction = 'plan' | 'cancel'

export const transportOrderApi = {
  ...createCrudApi<TransportOrderApi>({ basePath }),
  replaceLines: (no: string, lines: TransportOrderLineInput[]) =>
    httpClient.put<SingleResponse<TransportOrderApi>>(`${resourcePath(basePath, no)}/lines`, {
      lines
    }),
  act: (no: string, action: TransportOrderAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<TransportOrderApi>>(
      `${resourcePath(basePath, no)}/${action}`,
      body
    ),
  depart: (no: string) => httpClient.post(`${resourcePath(basePath, no)}/depart`, {}),
  declareLine: (no: string, lineNo: number, receivedQuantity: number) =>
    httpClient.post(`${resourcePath(basePath, no)}/lines/${lineNo}/declare`, { receivedQuantity }),
  handBack: (no: string, lineNo: number) =>
    httpClient.post(`${resourcePath(basePath, no)}/lines/${lineNo}/hand-back`, {}),
  closing: (no: string) =>
    httpClient.get<
      SingleResponse<{
        blocks: string[]
        documents: { kind: string; fileNo: string }[]
        debriefing: { voucherNo: string } | null
      }>
    >(`${resourcePath(basePath, no)}/closing`),
  attachDocument: (no: string, kind: string, fileNo: string) =>
    httpClient.post(`${resourcePath(basePath, no)}/documents`, { kind, fileNo }),
  saveDebriefing: (no: string, voucherNo: string) =>
    httpClient.post(`${resourcePath(basePath, no)}/debriefing`, { voucherNo }),
  close: (no: string) => httpClient.post(`${resourcePath(basePath, no)}/close`, {}),
  remainder: (no: string, lineNo: number, date: string) =>
    httpClient.post(`${resourcePath(basePath, no)}/lines/${lineNo}/remainder`, { date }),
  availability: (from: string, to: string) =>
    httpClient.get<SingleResponse<AvailabilityApi>>('/fleet/availability', {
      params: { from, to }
    })
}
