export type ModuleToggleGroup = 'fleet' | 'maintenance' | 'planning'

export interface ModuleToggleApi {
  no: string
  group: ModuleToggleGroup
  order: number
  active: boolean
  /** Features hidden from every profile while the module is off. */
  features: string[]
  modifiedAt: string
  modifiedBy: string
}

export type ModuleToggleSearchColumn = 'no'
