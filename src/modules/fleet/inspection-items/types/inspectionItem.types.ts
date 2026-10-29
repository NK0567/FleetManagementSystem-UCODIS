export const INSPECTION_PARTS = ['vehicle', 'tank'] as const
export type InspectionPart = (typeof INSPECTION_PARTS)[number]

export interface InspectionItemApi {
  no: string
  label: string
  part: InspectionPart
  sortOrder: number
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type InspectionItemSearchColumn = 'no' | 'label' | 'no,label'
