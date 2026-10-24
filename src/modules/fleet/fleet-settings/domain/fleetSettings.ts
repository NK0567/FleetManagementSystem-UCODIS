import {
  settingFieldIssues,
  timeToMinutes,
  type SettingField as GenericSettingField,
  type SettingFieldIssue
} from '@/core/utils/settingFields'
import type { DriverScoreSettings } from '@/modules/fleet/drivers'

export { timeToMinutes }

export interface DrivingTimeSettings {
  continuousDrivingMaxMin: number
  breakAfterDrivingMin: number
  dailyDrivingMaxMin: number
  dailyWorkMaxMin: number
  restBeforeDepartureMinH: number
  weeklyRestMinH: number
  weeklyDrivingMaxH: number
  /** Not checked when empty. */
  fortnightDrivingMaxH: number | null
  /** HH:MM; both empty when night driving is allowed. */
  nightBanStart: string
  nightBanEnd: string
}

export interface GeofencingSettings {
  /** Radius of a site whose type sets none. */
  defaultSiteRadiusM: number
}

export interface DocumentSettings {
  /** Notice of a document type that sets none. */
  defaultNoticeDays: number
}

export interface SafetySettings {
  /** Days given to re-inspect a vehicle after a non-conforming inspection. */
  recheckDelayDays: number
  /** Hours the driver has to explain a route deviation. */
  justificationDelayH: number
}

export interface FuelSettings {
  /** Refills are expected between these hours; the window may run past midnight. */
  refuelStartHour: number
  refuelEndHour: number
  /** Distance allowed between the vehicle and the station it says it filled up at. */
  gpsGapMaxKm: number
  /** Consumption gap, in percent of the reference, that calls for an explanation. */
  consumptionGapPct: number
  /** Reference consumption when neither the route nor the vehicle type sets one. */
  defaultL100: number
  co2GramsPerL: number
  /** Highest amount charged to a driver for one consumption gap; no cap when empty. */
  deductionCapAmount: number | null
  /** Tolerances to match a fuel card transaction with a refill. */
  matchingToleranceMin: number
  matchingTolerancePct: number
}

export interface TelematicsSettings {
  /** A unit silent for longer is shown as having lost its signal. */
  signalLossMin: number
}

export interface FleetSettings {
  drivingTime: DrivingTimeSettings
  geofencing: GeofencingSettings
  documents: DocumentSettings
  safety: SafetySettings
  fuel: FuelSettings
  telematics: TelematicsSettings
  driverScore: DriverScoreSettings
}

export type FleetSettingsSection = keyof FleetSettings

export const FLEET_SETTINGS_SECTIONS = [
  'drivingTime',
  'geofencing',
  'documents',
  'safety',
  'fuel',
  'telematics',
  'driverScore'
] as const

export type SettingUnit =
  | 'min'
  | 'h'
  | 'm'
  | 'days'
  | 'km'
  | 'percent'
  | 'l100'
  | 'gPerL'
  | 'amount'
  | 'points'

export type SettingField = GenericSettingField<SettingUnit>

export const FLEET_SETTING_FIELDS: Record<FleetSettingsSection, readonly SettingField[]> = {
  drivingTime: [
    { key: 'continuousDrivingMaxMin', kind: 'number', unit: 'min', min: 120, max: 360 },
    { key: 'breakAfterDrivingMin', kind: 'number', unit: 'min', min: 15, max: 90 },
    { key: 'dailyDrivingMaxMin', kind: 'number', unit: 'min', min: 360, max: 720 },
    { key: 'dailyWorkMaxMin', kind: 'number', unit: 'min', min: 480, max: 900 },
    { key: 'restBeforeDepartureMinH', kind: 'number', unit: 'h', min: 6, max: 24 },
    { key: 'weeklyRestMinH', kind: 'number', unit: 'h', min: 24, max: 48 },
    { key: 'weeklyDrivingMaxH', kind: 'number', unit: 'h', min: 40, max: 72 },
    { key: 'fortnightDrivingMaxH', kind: 'optionalNumber', unit: 'h', min: 60, max: 120 },
    { key: 'nightBanStart', kind: 'time' },
    { key: 'nightBanEnd', kind: 'time' }
  ],
  geofencing: [{ key: 'defaultSiteRadiusM', kind: 'number', unit: 'm', min: 200, max: 20_000 }],
  documents: [{ key: 'defaultNoticeDays', kind: 'number', unit: 'days', min: 1, max: 180 }],
  safety: [
    { key: 'recheckDelayDays', kind: 'number', unit: 'days', min: 1, max: 60 },
    { key: 'justificationDelayH', kind: 'number', unit: 'h', min: 1, max: 168 }
  ],
  fuel: [
    { key: 'refuelStartHour', kind: 'number', unit: 'h', min: 0, max: 23 },
    { key: 'refuelEndHour', kind: 'number', unit: 'h', min: 0, max: 24 },
    { key: 'gpsGapMaxKm', kind: 'number', unit: 'km', min: 1, max: 50 },
    { key: 'consumptionGapPct', kind: 'number', unit: 'percent', min: 1, max: 50 },
    { key: 'defaultL100', kind: 'number', unit: 'l100', min: 5, max: 100 },
    { key: 'co2GramsPerL', kind: 'number', unit: 'gPerL', min: 1000, max: 4000 },
    { key: 'deductionCapAmount', kind: 'optionalNumber', unit: 'amount', min: 0, max: 100000000 },
    { key: 'matchingToleranceMin', kind: 'number', unit: 'min', min: 5, max: 1440 },
    { key: 'matchingTolerancePct', kind: 'number', unit: 'percent', min: 0, max: 20 }
  ],
  telematics: [{ key: 'signalLossMin', kind: 'number', unit: 'min', min: 5, max: 240 }],
  driverScore: [
    { key: 'periodDays', kind: 'number', unit: 'days', min: 30, max: 365 },
    { key: 'weightSafety', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'weightRoute', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'weightRegulatory', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'weightDiscipline', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'weightEcoDriving', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'criticalPoints', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'majorPoints', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'minorPoints', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'stopCriticalPoints', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'stopOtherPoints', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'routeDeviationPoints', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'ecoEventPoints', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'missingDocumentCap', kind: 'number', unit: 'points', min: 0, max: 100 },
    { key: 'trainingThreshold', kind: 'number', unit: 'points', min: 0, max: 100 }
  ]
}

export const DEFAULT_FLEET_SETTINGS: FleetSettings = {
  drivingTime: {
    continuousDrivingMaxMin: 270,
    breakAfterDrivingMin: 45,
    dailyDrivingMaxMin: 600,
    dailyWorkMaxMin: 720,
    restBeforeDepartureMinH: 11,
    weeklyRestMinH: 24,
    weeklyDrivingMaxH: 56,
    fortnightDrivingMaxH: 90,
    nightBanStart: '22:00',
    nightBanEnd: '05:00'
  },
  geofencing: { defaultSiteRadiusM: 5_000 },
  documents: { defaultNoticeDays: 30 },
  safety: { recheckDelayDays: 15, justificationDelayH: 48 },
  fuel: {
    refuelStartHour: 4,
    refuelEndHour: 20,
    gpsGapMaxKm: 2,
    consumptionGapPct: 8,
    defaultL100: 37,
    co2GramsPerL: 2680,
    deductionCapAmount: 200000,
    matchingToleranceMin: 120,
    matchingTolerancePct: 2
  },
  telematics: { signalLossMin: 15 },
  driverScore: {
    periodDays: 90,
    weightSafety: 30,
    weightRoute: 25,
    weightRegulatory: 20,
    weightDiscipline: 15,
    weightEcoDriving: 10,
    criticalPoints: 15,
    majorPoints: 8,
    minorPoints: 3,
    stopCriticalPoints: 25,
    stopOtherPoints: 10,
    routeDeviationPoints: 20,
    ecoEventPoints: 5,
    missingDocumentCap: 60,
    trainingThreshold: 70
  }
}

export type SettingIssue =
  | SettingFieldIssue
  | { field: string; code: 'nightWindowIncomplete' }
  | { field: string; code: 'nightWindowEmpty' }

export function isFleetSettingsSection(value: string): value is FleetSettingsSection {
  return (FLEET_SETTINGS_SECTIONS as readonly string[]).includes(value)
}

function nightWindowIssue(values: DrivingTimeSettings): SettingIssue | null {
  const start = values.nightBanStart.trim()
  const end = values.nightBanEnd.trim()
  if (!start && !end) return null
  if (!start || !end)
    return { field: start ? 'nightBanEnd' : 'nightBanStart', code: 'nightWindowIncomplete' }
  const startMinutes = timeToMinutes(start)
  if (startMinutes !== null && startMinutes === timeToMinutes(end)) {
    return { field: 'nightBanEnd', code: 'nightWindowEmpty' }
  }
  return null
}

/** What prevents the values of a section from being saved; empty when they are valid. */
export function settingsSectionIssues<S extends FleetSettingsSection>(
  section: S,
  values: FleetSettings[S]
): SettingIssue[] {
  const record = values as unknown as Record<string, unknown>
  const issues: SettingIssue[] = settingFieldIssues(FLEET_SETTING_FIELDS[section], record)
  if (section === 'drivingTime' && issues.length === 0) {
    const night = nightWindowIssue(values as DrivingTimeSettings)
    if (night) issues.push(night)
  }
  return issues
}
