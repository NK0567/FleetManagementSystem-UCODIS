import { createCrudService } from '@/core/factories'
import { fuelCardApi } from '../api/fuelCardApi'
import type { FuelCardApi, FuelCardSearchColumn } from '../types/fuelCard.types'

export const fuelCardService = {
  ...createCrudService<FuelCardApi, FuelCardSearchColumn>(fuelCardApi),
  async block(no: string, reason: string): Promise<FuelCardApi> {
    return (await fuelCardApi.block(no, reason)).data.data
  },
  async unblock(no: string, comment: string): Promise<FuelCardApi> {
    return (await fuelCardApi.unblock(no, comment)).data.data
  }
}
