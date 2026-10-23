import { createCrudService } from '@/core/factories'
import { vehicleApi } from '../api/vehicleApi'
import type { VehicleApi, VehicleEquipmentApi, VehicleSearchColumn } from '../types/vehicle.types'

export interface VehicleRemovalInput {
  date: string
  reason: string
  finalOdometerKm: number | null
  comment: string
}

export const vehicleService = {
  ...createCrudService<VehicleApi, VehicleSearchColumn>(vehicleApi),
  async changePlate(no: string, plate: string, reason: string): Promise<VehicleApi> {
    return (await vehicleApi.changePlate(no, plate, reason)).data.data
  },
  async recordOdometer(no: string, km: number): Promise<VehicleApi> {
    return (await vehicleApi.recordOdometer(no, km)).data.data
  },
  async putOutOfService(no: string, reason: string): Promise<VehicleApi> {
    return (await vehicleApi.putOutOfService(no, reason)).data.data
  },
  async returnToService(no: string): Promise<VehicleApi> {
    return (await vehicleApi.returnToService(no)).data.data
  },
  async removeFromFleet(no: string, removal: VehicleRemovalInput): Promise<VehicleApi> {
    return (await vehicleApi.removeFromFleet(no, { ...removal })).data.data
  },
  async getEquipment(no: string): Promise<VehicleEquipmentApi[]> {
    return (await vehicleApi.getEquipment(no)).data.data
  },
  async addEquipment(no: string, body: Record<string, unknown>): Promise<VehicleEquipmentApi> {
    return (await vehicleApi.addEquipment(no, body)).data.data
  },
  async updateEquipment(
    no: string,
    equipmentNo: string,
    body: Record<string, unknown>
  ): Promise<VehicleEquipmentApi> {
    return (await vehicleApi.updateEquipment(no, equipmentNo, body)).data.data
  }
}
