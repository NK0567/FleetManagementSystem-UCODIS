import type {
  CheckPointResult,
  VehicleCheckMoment,
  VehicleCheckOutcome
} from '../domain/vehicleCheck'

export interface VehicleCheckApi {
  no: string
  moment: VehicleCheckMoment
  vehicleNo: string
  checkedAt: string
  odometerKm: number | null
  comment: string
  results: CheckPointResult[]
  checkedBy: string
  workOrderNo: string | null
  vehiclePlate: string
  anomalyCount: number
  outcome: VehicleCheckOutcome
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type VehicleCheckSearchColumn = 'no' | 'vehiclePlate' | 'no,vehiclePlate'
