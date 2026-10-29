import { createCrudService } from '@/core/factories'
import { fuelConsumptionApi } from '../api/fuelConsumptionApi'
import type {
  FuelConsumptionApi,
  FuelConsumptionSearchColumn,
  FuelConsumptionSummary,
  VehicleEmissionsApi
} from '../types/fuelConsumption.types'

export const fuelConsumptionService = {
  ...createCrudService<FuelConsumptionApi, FuelConsumptionSearchColumn>(fuelConsumptionApi),
  async summary(): Promise<FuelConsumptionSummary> {
    return (await fuelConsumptionApi.summary()).data.data
  },
  async emissions(): Promise<VehicleEmissionsApi[]> {
    return (await fuelConsumptionApi.emissions()).data.data
  },
  async qualify(no: string, causeNo: string, comment: string): Promise<FuelConsumptionApi> {
    return (await fuelConsumptionApi.qualify(no, causeNo, comment)).data.data
  },
  async propose(
    no: string,
    amount: number,
    monthlySalary: number | null
  ): Promise<FuelConsumptionApi> {
    return (await fuelConsumptionApi.propose(no, amount, monthlySalary)).data.data
  },
  async decide(no: string, approve: boolean, comment: string): Promise<FuelConsumptionApi> {
    return (await fuelConsumptionApi.decide(no, approve, comment)).data.data
  },
  async dismiss(no: string, comment: string): Promise<FuelConsumptionApi> {
    return (await fuelConsumptionApi.dismiss(no, comment)).data.data
  }
}
