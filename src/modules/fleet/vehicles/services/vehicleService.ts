import { createCrudService } from '@/core/factories'
import { vehicleApi } from '../api/vehicleApi'
import type { ImportReport } from '@/core/utils/csvImport'
import type { VehicleApi, VehicleEquipmentApi, VehicleSearchColumn } from '../types/vehicle.types'
import type {
  VehicleMaintenanceEntry,
  VehicleOwnershipCostApi
} from '../types/vehicleRecords.types'

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
  async addPhoto(no: string, fileNo: string): Promise<VehicleApi> {
    return (await vehicleApi.addPhoto(no, fileNo)).data.data
  },
  async removePhoto(no: string, fileNo: string): Promise<VehicleApi> {
    return (await vehicleApi.removePhoto(no, fileNo)).data.data
  },
  async importRows(rows: Record<string, unknown>[]): Promise<ImportReport> {
    return (await vehicleApi.importRows(rows)).data.data
  },
  async maintenanceLog(no: string): Promise<VehicleMaintenanceEntry[]> {
    return (await vehicleApi.maintenanceLog(no)).data.data
  },
  async ownershipCost(no: string): Promise<VehicleOwnershipCostApi> {
    return (await vehicleApi.ownershipCost(no)).data.data
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
