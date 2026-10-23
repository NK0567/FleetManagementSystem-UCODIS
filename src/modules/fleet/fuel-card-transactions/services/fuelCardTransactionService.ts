import { createCrudService } from '@/core/factories'
import { fuelCardTransactionApi } from '../api/fuelCardTransactionApi'
import type {
  FuelCardTransactionApi,
  FuelCardTransactionSearchColumn
} from '../types/fuelCardTransaction.types'

export const fuelCardTransactionService = {
  ...createCrudService<FuelCardTransactionApi, FuelCardTransactionSearchColumn>(
    fuelCardTransactionApi
  ),
  async matchAll(): Promise<number> {
    return (await fuelCardTransactionApi.matchAll()).data.data.matched
  },
  async match(no: string, refillNo: string): Promise<FuelCardTransactionApi> {
    return (await fuelCardTransactionApi.match(no, refillNo)).data.data
  },
  async detach(no: string): Promise<FuelCardTransactionApi> {
    return (await fuelCardTransactionApi.detach(no)).data.data
  },
  async createRefill(
    no: string,
    odometerKm: number,
    fullTank: boolean
  ): Promise<FuelCardTransactionApi> {
    return (await fuelCardTransactionApi.createRefill(no, odometerKm, fullTank)).data.data
  }
}
