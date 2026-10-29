import httpClient from '@/core/api/httpClient'
import { createCrudApi } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { ImportReport } from '@/core/utils/csvImport'
import type { JobPositionApi } from '../types/jobPosition.types'

const basePath = '/hr/job-positions'

export const jobPositionApi = {
  ...createCrudApi<JobPositionApi>({ basePath }),
  importRows: (rows: Record<string, unknown>[]) =>
    httpClient.post<SingleResponse<ImportReport>>(`${basePath}/import`, { rows })
}
