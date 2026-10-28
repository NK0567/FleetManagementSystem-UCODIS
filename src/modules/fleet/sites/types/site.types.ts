export interface SiteApi {
  no: string
  name: string
  siteTypeNo: string
  city: string
  region: string
  address: string
  email: string
  thirdPartyOwner: string
  active: boolean
  latitude: number
  longitude: number
  radiusM: number | null
  siteTypeName: string
  effectiveRadiusM: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type SiteSearchColumn = 'no' | 'name' | 'city' | 'no,name,city'
