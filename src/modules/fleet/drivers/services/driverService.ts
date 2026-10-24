import { createCrudService } from '@/core/factories'
import { driverApi } from '../api/driverApi'
import type { DriverApi, DriverScoreApi, DriverSearchColumn } from '../types/driver.types'

export const driverService = {
  ...createCrudService<DriverApi, DriverSearchColumn>(driverApi),
  async score(no: string): Promise<DriverScoreApi> {
    return (await driverApi.score(no)).data.data
  },
  async proposeTraining(no: string): Promise<DriverScoreApi> {
    return (await driverApi.proposeTraining(no)).data.data
  }
}
