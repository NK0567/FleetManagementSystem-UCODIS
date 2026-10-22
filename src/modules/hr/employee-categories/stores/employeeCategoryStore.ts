import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { employeeCategoryService } from '../services/employeeCategoryService'
import type {
  EmployeeCategoryApi,
  EmployeeCategorySearchColumn
} from '../types/employeeCategory.types'

export const useEmployeeCategoryStore = defineStore('hr-employee-category', () => {
  const crud = useCrudState<EmployeeCategoryApi, EmployeeCategorySearchColumn>({
    persistKey: 'hr-employee-category',
    service: employeeCategoryService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'hr.employeeCategories.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
