export const DEVIATION_CATEGORIES = ['route', 'stop', 'time'] as const
export type DeviationCategory = (typeof DEVIATION_CATEGORIES)[number]

export const DEVIATION_SEVERITIES = ['minor', 'major', 'critical'] as const
export type DeviationSeverity = (typeof DEVIATION_SEVERITIES)[number]

export const DEVIATION_UNITS = ['min', 'h', 'm', 'km', 'percent'] as const
export type DeviationUnit = (typeof DEVIATION_UNITS)[number]

export interface DeviationTypeApi {
  no: string
  name: string
  category: DeviationCategory
  severity: DeviationSeverity
  threshold: number | null
  unit: DeviationUnit | null
  autoDetected: boolean
  active: boolean
  deviationCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DeviationTypeSearchColumn = 'no' | 'name' | 'no,name'
