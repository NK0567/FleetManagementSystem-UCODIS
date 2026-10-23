export const COUPLING_ROLES = ['tows', 'towed', 'none'] as const
export type CouplingRole = (typeof COUPLING_ROLES)[number]

export interface VehicleTypeApi {
  no: string
  name: string
  motorized: boolean
  couplingRole: CouplingRole
  carriesGoods: boolean
  hasCompartments: boolean
  active: boolean
  vehicleCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type VehicleTypeSearchColumn = 'no' | 'name' | 'no,name'
