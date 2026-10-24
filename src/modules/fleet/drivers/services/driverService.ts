import { createCrudService } from '@/core/factories'
import { driverApi } from '../api/driverApi'
import type {
  DriverActivityApi,
  DriverApi,
  DriverScoreApi,
  DriverSearchColumn
} from '../types/driver.types'

export const driverService = {
  ...createCrudService<DriverApi, DriverSearchColumn>(driverApi),
  async activity(no: string): Promise<DriverActivityApi> {
    return (await driverApi.activity(no)).data.data
  },
  async score(no: string): Promise<DriverScoreApi> {
    return (await driverApi.score(no)).data.data
  },
  async proposeTraining(no: string): Promise<DriverScoreApi> {
    return (await driverApi.proposeTraining(no)).data.data
  }
}
