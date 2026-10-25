import type { VehicleCheckMoment } from '@/modules/maintenance/vehicle-checks/domain/vehicleCheck'

export interface VehicleCheckPointApi {
  no: string
  moment: VehicleCheckMoment
  label: string
  blocking: boolean
  sortOrder: number
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type VehicleCheckPointSearchColumn = 'no' | 'label' | 'no,label'
