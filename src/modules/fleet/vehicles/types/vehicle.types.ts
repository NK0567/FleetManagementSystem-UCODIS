import type { FileMeta } from '@/types/file.types'
import type { CouplingRole } from '@/modules/fleet/vehicle-types/types/vehicleType.types'
import type { EquipmentCapability } from '@/modules/fleet/equipment-types/types/equipmentType.types'

export const VEHICLE_STATUSES = [
  'available',
  'assigned',
  'in_mission',
  'immobilized',
  'out_of_service',
  'removed'
] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export const FUEL_TYPES = ['diesel', 'petrol', 'electric', 'hybrid', 'lpg'] as const
export type FuelType = (typeof FUEL_TYPES)[number]

export const ACQUISITION_MODES = ['purchase', 'rental', 'leasing'] as const
export type AcquisitionMode = (typeof ACQUISITION_MODES)[number]

export const ODOMETER_SOURCES = ['manual', 'trip', 'refill', 'removal', 'work_order'] as const
export type OdometerSource = (typeof ODOMETER_SOURCES)[number]

export const EQUIPMENT_STATES = ['operational', 'out_of_service', 'uninstalled'] as const
export type EquipmentState = (typeof EQUIPMENT_STATES)[number]

export type EquipmentDueState = 'ok' | 'due_soon' | 'overdue'

export interface VehicleCompartment {
  no: number
  volumeL: number
}

export interface PlateChange {
  previousPlate: string
  newPlate: string
  changedAt: string
  changedBy: string
  reason: string
}

export interface OdometerReading {
  readAt: string
  km: number
  source: OdometerSource
  recordedBy: string
}

export interface VehicleOutOfService {
  reason: string
  since: string
  by: string
}

export interface VehicleRemoval {
  date: string
  reason: string
  finalOdometerKm: number | null
  comment: string
  recordedBy: string
}

export interface VehicleApi {
  no: string
  plate: string
  vin: string
  vehicleTypeNo: string
  vehicleTypeName: string
  motorized: boolean
  couplingRole: CouplingRole
  carriesGoods: boolean
  hasCompartments: boolean
  make: string
  model: string
  category: string
  homeSiteNo: string
  homeSiteName: string
  year: number | null
  firstRegistrationDate: string | null
  fuelType: FuelType | null
  tankCapacityL: number | null
  maxLoadKg: number | null
  maxVolumeM3: number | null
  compartments: VehicleCompartment[]
  totalCapacityL: number
  acquisitionMode: AcquisitionMode | null
  acquisitionDate: string | null
  acquisitionProviderNo: string | null
  acquisitionCost: number | null
  residualValue: number | null
  monthlyPayment: number | null
  odometerKm: number
  odometerReadings: OdometerReading[]
  plateHistory: PlateChange[]
  /** Former plates, joined, so that a search also finds the vehicle by an old plate. */
  formerPlates: string
  outOfService: VehicleOutOfService | null
  removal: VehicleRemoval | null
  status: VehicleStatus
  statusReason: string
  driverNo: string | null
  driverName: string
  coupledVehicleNo: string | null
  coupledVehiclePlate: string
  hasTracker: boolean
  hasCamera: boolean
  hasPump: boolean
  photos: FileMeta[]
  documentsCompliant: boolean
  /** Mandatory documents missing or past their validity, named in the language of the request. */
  documentGaps: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type VehicleSearchColumn =
  | 'no'
  | 'plate'
  | 'vin'
  | 'formerPlates'
  | 'no,plate,vin,formerPlates'

export interface VehicleEquipmentApi {
  no: string
  vehicleNo: string
  equipmentTypeNo: string
  equipmentTypeName: string
  capability: EquipmentCapability
  serialNumber: string
  state: EquipmentState
  dueDate: string | null
  dueState: EquipmentDueState | null
  installedOn: string | null
  modifiedAt: string
  modifiedBy: string
}
