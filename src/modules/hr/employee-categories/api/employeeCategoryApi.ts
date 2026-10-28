import { createCrudApi } from '@/core/factories'
import type { EmployeeCategoryApi } from '../types/employeeCategory.types'

export const employeeCategoryApi = createCrudApi<EmployeeCategoryApi>({
  basePath: '/hr/employee-categories'
})
