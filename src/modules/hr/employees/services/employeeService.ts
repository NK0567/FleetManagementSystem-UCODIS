import { createCrudService } from '@/core/factories'
import { employeeApi } from '../api/employeeApi'
import type { ManualEmployeeStatus } from '../domain/employee'
import type { EmployeeApi, EmployeeSearchColumn } from '../types/employee.types'

export const employeeService = {
  ...createCrudService<EmployeeApi, EmployeeSearchColumn>(employeeApi),
  async setStatus(no: string, status: ManualEmployeeStatus, reason: string): Promise<EmployeeApi> {
    return (await employeeApi.setStatus(no, status, reason)).data.data
  },
  async archive(no: string, reason: string): Promise<EmployeeApi> {
    return (await employeeApi.archive(no, reason)).data.data
  },
  async setDrivingAuthorization(no: string, authorized: boolean): Promise<EmployeeApi> {
    return (await employeeApi.setDrivingAuthorization(no, authorized)).data.data
  }
}
