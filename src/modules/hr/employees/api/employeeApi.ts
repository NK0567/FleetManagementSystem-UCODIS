import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { ManualEmployeeStatus } from '../domain/employee'
import type { EmployeeApi } from '../types/employee.types'

const basePath = '/hr/employees'

const action = (no: string, name: string, body: Record<string, unknown>) =>
  httpClient.post<SingleResponse<EmployeeApi>>(`${resourcePath(basePath, no)}/${name}`, body)

export const employeeApi = {
  ...createCrudApi<EmployeeApi>({ basePath }),
  setStatus: (no: string, status: ManualEmployeeStatus, reason: string) =>
    action(no, 'status', { status, reason }),
  archive: (no: string, reason: string) => action(no, 'archive', { reason }),
  setDrivingAuthorization: (no: string, authorized: boolean) =>
    action(no, 'driving-authorization', { authorized })
}
