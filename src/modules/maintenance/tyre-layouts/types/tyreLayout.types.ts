import type { TyreAxle } from '@/modules/maintenance/tyres/domain/tyre'

/** The tyre layout of a vehicle type; `no` is the vehicle type code. */
export interface TyreLayoutApi {
  no: string
  axles: TyreAxle[]
  spares: number
  vehicleTypeName: string
  axleCount: number
  positionCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TyreLayoutSearchColumn = 'no' | 'vehicleTypeName' | 'no,vehicleTypeName'
