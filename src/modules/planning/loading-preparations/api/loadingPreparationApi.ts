import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  LoadingPreparationApi,
  PlanEntry,
  PreparationOptionsApi,
  PreparationVehicleInput
} from '../types/loadingPreparation.types'

const BASE = '/planning/loading-preparations'

export interface PreparationHeaderInput {
  depotSiteNo: string
  loadingDate: string
  validUntil: string | null
  region: string
  requestNos: string[]
  vehicles: PreparationVehicleInput[]
}

const data = <T>(promise: Promise<{ data: SingleResponse<T> }>) => promise.then((r) => r.data.data)

export const loadingPreparationApi = {
  list: () => data(httpClient.get<SingleResponse<LoadingPreparationApi[]>>(BASE)),
  options: (except?: string) =>
    data(
      httpClient.get<SingleResponse<PreparationOptionsApi>>(`${BASE}/options`, {
        params: except ? { except } : {}
      })
    ),
  create: (body: PreparationHeaderInput) =>
    data(httpClient.post<SingleResponse<LoadingPreparationApi>>(BASE, body)),
  update: (no: string, body: PreparationHeaderInput) =>
    data(httpClient.patch<SingleResponse<LoadingPreparationApi>>(resourcePath(BASE, no), body)),
  validate: (no: string) =>
    data(
      httpClient.post<SingleResponse<LoadingPreparationApi>>(
        `${resourcePath(BASE, no)}/validate`,
        {}
      )
    ),
  propose: (no: string) =>
    data(
      httpClient.post<SingleResponse<LoadingPreparationApi>>(
        `${resourcePath(BASE, no)}/propose`,
        {}
      )
    ),
  savePlan: (no: string, entries: PlanEntry[]) =>
    data(
      httpClient.put<SingleResponse<LoadingPreparationApi>>(`${resourcePath(BASE, no)}/plan`, {
        entries
      })
    )
}
