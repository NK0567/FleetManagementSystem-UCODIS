export interface SiteTypeApi {
  no: string
  name: string
  defaultRadiusM: number
  color: string
  loadingDepot: boolean
  restAllowed: boolean
  restricted: boolean
  active: boolean
  siteCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type SiteTypeSearchColumn = 'no' | 'name' | 'no,name'
