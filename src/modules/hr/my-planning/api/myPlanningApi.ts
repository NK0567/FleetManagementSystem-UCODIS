import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { MyPlanningApi } from '../types/myPlanning.types'

export const myPlanningApi = {
  get: (weekStart?: string) =>
    httpClient.get<SingleResponse<MyPlanningApi>>('/hr/my-planning', {
      params: weekStart ? { weekStart } : {}
    })
}
