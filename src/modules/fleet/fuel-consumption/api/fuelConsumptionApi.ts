import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { FuelConsumptionApi, FuelConsumptionSummary } from '../types/fuelConsumption.types'

const basePath = '/fleet/fuel-consumption'
type Response = SingleResponse<FuelConsumptionApi>

export const fuelConsumptionApi = {
  ...createCrudApi<FuelConsumptionApi>({ basePath }),
  summary: () => httpClient.get<SingleResponse<FuelConsumptionSummary>>(`${basePath}/summary`),
  qualify: (no: string, causeNo: string, comment: string) =>
    httpClient.post<Response>(`${resourcePath(basePath, no)}/qualify`, { causeNo, comment }),
  propose: (no: string, amount: number, monthlySalary: number | null) =>
    httpClient.post<Response>(`${resourcePath(basePath, no)}/propose`, { amount, monthlySalary }),
  decide: (no: string, approve: boolean, comment: string) =>
    httpClient.post<Response>(`${resourcePath(basePath, no)}/decide`, { approve, comment }),
  dismiss: (no: string, comment: string) =>
    httpClient.post<Response>(`${resourcePath(basePath, no)}/dismiss`, { comment })
}
