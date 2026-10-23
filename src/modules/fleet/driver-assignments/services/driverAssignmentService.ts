import { createCrudService } from '@/core/factories'
import { driverAssignmentApi } from '../api/driverAssignmentApi'
import type {
  DriverAssignmentApi,
  DriverAssignmentSearchColumn
} from '../types/driverAssignment.types'

export const driverAssignmentService = {
  ...createCrudService<DriverAssignmentApi, DriverAssignmentSearchColumn>(driverAssignmentApi),
  async end(no: string, endDate: string): Promise<DriverAssignmentApi> {
    return (await driverAssignmentApi.end(no, endDate)).data.data
  }
}
