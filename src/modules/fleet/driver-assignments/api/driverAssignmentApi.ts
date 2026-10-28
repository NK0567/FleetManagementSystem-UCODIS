import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DriverAssignmentApi } from '../types/driverAssignment.types'

const basePath = '/fleet/driver-assignments'

export const driverAssignmentApi = {
  ...createCrudApi<DriverAssignmentApi>({ basePath }),
  end: (no: string, endDate: string) =>
    httpClient.post<SingleResponse<DriverAssignmentApi>>(`${resourcePath(basePath, no)}/end`, {
      endDate
    })
}
