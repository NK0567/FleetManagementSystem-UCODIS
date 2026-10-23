import { createCrudService } from '@/core/factories'
import { fuelConsumptionApi } from '../api/fuelConsumptionApi'
import type {
  FuelConsumptionApi,
  FuelConsumptionSearchColumn,
  FuelConsumptionSummary
} from '../types/fuelConsumption.types'

export const fuelConsumptionService = {
  ...createCrudService<FuelConsumptionApi, FuelConsumptionSearchColumn>(fuelConsumptionApi),
  async summary(): Promise<FuelConsumptionSummary> {
    return (await fuelConsumptionApi.summary()).data.data
  },
  async qualify(no: string, causeNo: string, comment: string): Promise<FuelConsumptionApi> {
    return (await fuelConsumptionApi.qualify(no, causeNo, comment)).data.data
  },
  async propose(no: string, amount: number): Promise<FuelConsumptionApi> {
    return (await fuelConsumptionApi.propose(no, amount)).data.data
  },
  async decide(no: string, approve: boolean, comment: string): Promise<FuelConsumptionApi> {
    return (await fuelConsumptionApi.decide(no, approve, comment)).data.data
  },
  async dismiss(no: string, comment: string): Promise<FuelConsumptionApi> {
    return (await fuelConsumptionApi.dismiss(no, comment)).data.data
  }
}
