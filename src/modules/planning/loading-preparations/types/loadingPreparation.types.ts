/**
 * Preparing the loading of several vehicles from one depot (TRS01-US20): its date, its
 * validity date, its region and its orders, shared between the chosen vehicles compartment by
 * compartment (TRS01-US22). A new preparation is pending.
 */
export type PreparationStatus = 'pending' | 'validated'

export interface PreparationVehicleInput {
  vehicleNo: string
  trailerNo: string | null
  driverNo: string | null
}

export interface PlanEntry {
  vehicleNo: string
  compartmentNo: number
  requestNo: string
  requestLineNo: number
  quantity: number
}

export type PreparationIssue =
  | { code: 'overCapacity'; quantityL: number; capacityL: number }
  | { code: 'incompatible'; plate: string; productA: string; productB: string }
  | { code: 'compartmentRule'; plate: string; compartmentNo: number; rule: string }
  | { code: 'equipmentMissing'; plate: string; point: string; equipment: 'pump' | 'vehicleType' }
  | { code: 'unplaced'; requestNo: string; product: string; quantity: number; unit: string }

export interface PreparationCompartmentApi {
  no: number
  volumeL: number | null
  families: string[]
  content: string
  fullFill: boolean
  usedL: number
}

export interface PreparationVehicleApi extends PreparationVehicleInput {
  plate: string
  trailerPlate: string
  driverName: string
  capacityL: number | null
  compartments: PreparationCompartmentApi[]
}

export interface PreparationRequestLineApi {
  requestNo: string
  requestLineNo: number
  recipientName: string
  deliveryPointName: string
  productNo: string
  productName: string
  unit: string
  quantity: number
  placed: number
}

export interface LoadingPreparationApi {
  no: string
  depotSiteNo: string
  depotName: string
  loadingDate: string
  validUntil: string | null
  region: string
  status: PreparationStatus
  requestNos: string[]
  vehicles: PreparationVehicleApi[]
  requestLines: PreparationRequestLineApi[]
  plan: PlanEntry[]
  /** Totals asked by TRS01-US20: what is to deliver, against the capacity of the vehicles. */
  totals: { byUnit: { unit: string; quantity: number }[]; quantityL: number; capacityL: number }
  issues: PreparationIssue[]
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export interface PreparationOptionsApi {
  depots: { no: string; name: string; region: string }[]
  regions: string[]
  requests: {
    no: string
    recipientName: string
    deliveryPointName: string
    region: string
    desiredDate: string
    summary: string
  }[]
  vehicles: { no: string; plate: string; typeName: string; carriesGoods: boolean }[]
  drivers: { no: string; name: string }[]
}
