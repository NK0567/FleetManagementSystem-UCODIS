export const TELEMATICS_FAMILIES = [
  'behavior',
  'camera',
  'fault',
  'signal',
  'site',
  'stop'
] as const
export type TelematicsFamily = (typeof TELEMATICS_FAMILIES)[number]

export const TELEMATICS_SEVERITIES = ['minor', 'major', 'critical'] as const
export type TelematicsSeverity = (typeof TELEMATICS_SEVERITIES)[number]

export const TELEMATICS_UNITS = ['kmh', 'g', 'min', 'celsius'] as const
export type TelematicsUnit = (typeof TELEMATICS_UNITS)[number]

export interface TelematicsEventTypeApi {
  no: string
  name: string
  family: TelematicsFamily
  severity: TelematicsSeverity
  threshold: number | null
  unit: TelematicsUnit | null
  raisesAlert: boolean
  affectsScore: boolean
  infractionTypeNo: string | null
  active: boolean
  infractionTypeName: string
  eventCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TelematicsEventTypeSearchColumn = 'no' | 'name' | 'no,name'
