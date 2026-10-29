import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { ImportReport } from '@/core/utils/csvImport'
import type { VehicleApi, VehicleEquipmentApi } from '../types/vehicle.types'
import type {
  VehicleMaintenanceEntry,
  VehicleOwnershipCostApi
} from '../types/vehicleRecords.types'

const basePath = '/fleet/vehicles'

const action = (no: string, name: string, body: Record<string, unknown>) =>
  httpClient.post<SingleResponse<VehicleApi>>(`${resourcePath(basePath, no)}/${name}`, body)

const equipmentPath = (no: string) => `${resourcePath(basePath, no)}/equipment`

export const vehicleApi = {
  ...createCrudApi<VehicleApi>({ basePath }),
  changePlate: (no: string, plate: string, reason: string) =>
    action(no, 'plate', { plate, reason }),
  recordOdometer: (no: string, km: number) => action(no, 'odometer', { km }),
  putOutOfService: (no: string, reason: string) => action(no, 'out-of-service', { reason }),
  returnToService: (no: string) => action(no, 'return-to-service', {}),
  removeFromFleet: (no: string, body: Record<string, unknown>) => action(no, 'remove', body),
  addPhoto: (no: string, fileNo: string) => action(no, 'photos', { fileNo }),
  removePhoto: (no: string, fileNo: string) =>
    httpClient.delete<SingleResponse<VehicleApi>>(
      `${resourcePath(basePath, no)}/photos/${encodeURIComponent(fileNo)}`
    ),
  importRows: (rows: Record<string, unknown>[]) =>
    httpClient.post<SingleResponse<ImportReport>>(`${basePath}/import`, { rows }),
  maintenanceLog: (no: string) =>
    httpClient.get<SingleResponse<VehicleMaintenanceEntry[]>>(
      `${resourcePath(basePath, no)}/maintenance-log`
    ),
  ownershipCost: (no: string) =>
    httpClient.get<SingleResponse<VehicleOwnershipCostApi>>(
      `${resourcePath(basePath, no)}/ownership-cost`
    ),
  getEquipment: (no: string) =>
    httpClient.get<SingleResponse<VehicleEquipmentApi[]>>(equipmentPath(no)),
  addEquipment: (no: string, body: Record<string, unknown>) =>
    httpClient.post<SingleResponse<VehicleEquipmentApi>>(equipmentPath(no), body),
  updateEquipment: (no: string, equipmentNo: string, body: Record<string, unknown>) =>
    httpClient.patch<SingleResponse<VehicleEquipmentApi>>(
      `${equipmentPath(no)}/${encodeURIComponent(equipmentNo)}`,
      body
    )
}
