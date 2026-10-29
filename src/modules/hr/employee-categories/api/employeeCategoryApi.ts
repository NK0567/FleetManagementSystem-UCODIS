import httpClient from '@/core/api/httpClient'
import { createCrudApi } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { ImportReport } from '@/core/utils/csvImport'
import type { EmployeeCategoryApi } from '../types/employeeCategory.types'

const basePath = '/hr/employee-categories'

export const employeeCategoryApi = {
  ...createCrudApi<EmployeeCategoryApi>({ basePath }),
  importRows: (rows: Record<string, unknown>[]) =>
    httpClient.post<SingleResponse<ImportReport>>(`${basePath}/import`, { rows })
}
