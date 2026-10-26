import { workshopLoadApi } from '../api/workshopLoadApi'
import type { WorkshopLoadApi } from '../types/workshopLoad.types'

export const workshopLoadService = {
  async get(): Promise<WorkshopLoadApi> {
    return (await workshopLoadApi.get()).data.data
  }
}
