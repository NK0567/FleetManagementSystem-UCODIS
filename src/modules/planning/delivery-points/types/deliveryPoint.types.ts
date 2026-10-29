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
  /** A recipient's delivery site, or a loading depot (TRS07-US02). */
  kind: 'delivery' | 'depot'
  /** The site of the FMS register it stands for, whose place it takes. */
  siteNo: string | null
  siteName: string
  siteRegion: string
  /** The third party owning the depot; empty when it is the company's. */
  ownerName: string
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
