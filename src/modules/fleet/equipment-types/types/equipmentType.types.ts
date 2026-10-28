export const EQUIPMENT_CAPABILITIES = ['tracker', 'camera', 'pump', 'safety', 'other'] as const
export type EquipmentCapability = (typeof EQUIPMENT_CAPABILITIES)[number]

export interface EquipmentTypeApi {
  no: string
  name: string
  capability: EquipmentCapability
  hasDueDate: boolean
  noticeDays: number
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type EquipmentTypeSearchColumn = 'no' | 'name' | 'no,name'
