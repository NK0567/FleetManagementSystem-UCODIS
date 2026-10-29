import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { InspectionApi } from '../types/inspection.types'

const basePath = '/fleet/inspections'

export interface InspectionGridItem {
  itemNo: string
  label: string
  part: 'vehicle' | 'tank'
}

export const inspectionApi = {
  ...createCrudApi<InspectionApi>({ basePath }),
  grid: (vehicleNo: string) =>
    httpClient.get<SingleResponse<InspectionGridItem[]>>(`${basePath}/grid`, {
      params: { vehicleNo }
    }),
  recheck: (no: string, recheckDoneOn: string) =>
    httpClient.post<SingleResponse<InspectionApi>>(`${resourcePath(basePath, no)}/recheck`, {
      recheckDoneOn
    })
}
