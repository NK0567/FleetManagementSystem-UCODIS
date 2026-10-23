export const INFRACTION_SEVERITIES = ['minor', 'major', 'serious'] as const
export type InfractionSeverity = (typeof INFRACTION_SEVERITIES)[number]

export interface InfractionTypeApi {
  no: string
  name: string
  defaultSeverity: InfractionSeverity
  active: boolean
  infractionCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type InfractionTypeSearchColumn = 'no' | 'name' | 'no,name'
