export const COUPLING_ROLES = ['tows', 'towed', 'none'] as const
export type CouplingRole = (typeof COUPLING_ROLES)[number]

export interface VehicleTypeApi {
  no: string
  name: string
  motorized: boolean
  couplingRole: CouplingRole
  carriesGoods: boolean
  hasCompartments: boolean
  /** Usual consumption of a vehicle of this type, in L/100 km; the fleet default otherwise. */
  fuelReferenceL100: number | null
  active: boolean
  vehicleCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type VehicleTypeSearchColumn = 'no' | 'name' | 'no,name'
