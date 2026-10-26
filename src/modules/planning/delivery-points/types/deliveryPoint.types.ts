export interface DeliveryPointApi {
  no: string
  name: string
  customerNo: string
  address: string
  city: string
  latitude: number
  longitude: number
  pumpRequired: boolean
  acceptedVehicleTypeNos: string[]
  active: boolean
  customerName: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DeliveryPointSearchColumn =
  | 'no'
  | 'name'
  | 'customerName'
  | 'city'
  | 'no,name,customerName,city'
