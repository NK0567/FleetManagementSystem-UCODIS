import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { WorkshopLoadApi } from '../types/workshopLoad.types'

export const workshopLoadApi = {
  get: () => httpClient.get<SingleResponse<WorkshopLoadApi>>('/maintenance/workshop-load')
}
