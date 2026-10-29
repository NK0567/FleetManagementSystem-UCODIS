export interface FuelReferenceApi {
  no: string
  vehicleNo: string
  /** The corridor (itinéraire type); empty means every corridor of the vehicle. */
  routeTemplateNo: string | null
  referenceL100: number
  comment: string
  vehiclePlate: string
  routeName: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type FuelReferenceSearchColumn = 'vehiclePlate' | 'routeName' | 'vehiclePlate,routeName'
