export interface EmployeeCategoryApi {
  no: string
  name: string
  description: string
  /** Annual leave days granted to the employees of the category. */
  annualLeaveDays: number
  active: boolean
  employeeCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type EmployeeCategorySearchColumn = 'no' | 'name' | 'no,name'
