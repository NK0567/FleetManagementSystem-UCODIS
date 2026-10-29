import { createCrudService } from '@/core/factories'
import type { ImportReport } from '@/core/utils/csvImport'
import { employeeCategoryApi } from '../api/employeeCategoryApi'
import type {
  EmployeeCategoryApi,
  EmployeeCategorySearchColumn
} from '../types/employeeCategory.types'

export const employeeCategoryService = {
  ...createCrudService<EmployeeCategoryApi, EmployeeCategorySearchColumn>(employeeCategoryApi),
  async importRows(rows: Record<string, unknown>[]): Promise<ImportReport> {
    return (await employeeCategoryApi.importRows(rows)).data.data
  }
}
