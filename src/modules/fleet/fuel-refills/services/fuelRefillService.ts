import { createCrudService } from '@/core/factories'
import { fuelRefillApi } from '../api/fuelRefillApi'
import type {
  FuelRefillApi,
  FuelRefillSearchColumn,
  RefillImportReport
} from '../types/fuelRefill.types'

export const fuelRefillService = {
  ...createCrudService<FuelRefillApi, FuelRefillSearchColumn>(fuelRefillApi),
  async qualify(no: string, causeNo: string, comment: string): Promise<FuelRefillApi> {
    return (await fuelRefillApi.qualify(no, causeNo, comment)).data.data
  },
  async importRows(rows: Record<string, unknown>[]): Promise<RefillImportReport> {
    return (await fuelRefillApi.importRows(rows)).data.data
  }
}
