import { createCrudService } from '@/core/factories'
import type { ImportReport } from '@/core/utils/csvImport'
import { jobPositionApi } from '../api/jobPositionApi'
import type { JobPositionApi, JobPositionSearchColumn } from '../types/jobPosition.types'

export const jobPositionService = {
  ...createCrudService<JobPositionApi, JobPositionSearchColumn>(jobPositionApi),
  async importRows(rows: Record<string, unknown>[]): Promise<ImportReport> {
    return (await jobPositionApi.importRows(rows)).data.data
  }
}
