import { createCrudService } from '@/core/factories'
import { employeeApi } from '../api/employeeApi'
import type { ManualEmployeeStatus } from '../domain/employee'
import type { ImportReport } from '@/core/utils/csvImport'
import type { EmployeeApi, EmployeeSearchColumn, StaffSyncReport } from '../types/employee.types'

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
  },
  async importRows(rows: Record<string, unknown>[]): Promise<ImportReport> {
    return (await employeeApi.importRows(rows)).data.data
  },
  async synchronize(): Promise<StaffSyncReport> {
    return (await employeeApi.synchronize()).data.data
  }
}
