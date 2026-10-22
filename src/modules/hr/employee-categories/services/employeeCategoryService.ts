import { createCrudService } from '@/core/factories'
import { employeeCategoryApi } from '../api/employeeCategoryApi'
import type {
  EmployeeCategoryApi,
  EmployeeCategorySearchColumn
} from '../types/employeeCategory.types'

export const employeeCategoryService = createCrudService<
  EmployeeCategoryApi,
  EmployeeCategorySearchColumn
>(employeeCategoryApi)
