import { settingFieldIssues, type SettingField } from '@/core/utils/settingFields'

export interface WorkshopSettings {
  stations: number
  hoursPerDay: number
  workingDaysPerWeek: number
}

export interface LabourSettings {
  hourlyRate: number
}

export interface DowntimeCostSettings {
  /** Cost of a day without a vehicle when its kind sets none. */
  dayCost: number
  tractorDayCost: number | null
  trailerDayCost: number | null
}

export interface ServiceSettings {
  /** How early a service becomes due soon. */
  noticeKm: number
  noticeDays: number
  noticeHours: number
}

export interface TyreSettings {
  minPressureBar: number
  minTreadMm: number
  rotationKm: number
  rotationMonths: number
}

export interface MobileTeamSettings {
  interventionsPerMonth: number
  resolutionRatePct: number
  averageTimeMin: number
  checksPerMonth: number
}

/** Targets the maintenance indicators are compared with (FLT07-US03). */
export interface MaintenanceTargetSettings {
  preventiveShareTargetPct: number
  preventiveCompletionTargetPct: number
  /** Longest acceptable mean time to repair. */
  mttrTargetHours: number
  /** Shortest acceptable mean distance between failures. */
  mtbfTargetKm: number
}

export interface MaintenanceSettings {
  targets: MaintenanceTargetSettings
  workshop: WorkshopSettings
  labour: LabourSettings
  downtimeCost: DowntimeCostSettings
  service: ServiceSettings
  tyres: TyreSettings
  mobileTeam: MobileTeamSettings
}

export type MaintenanceSettingsSection = keyof MaintenanceSettings

export const MAINTENANCE_SETTINGS_SECTIONS = [
  'workshop',
  'labour',
  'downtimeCost',
  'service',
  'tyres',
  'mobileTeam',
  'targets'
] as const

export type MaintenanceSettingUnit =
  | 'count'
  | 'h'
  | 'days'
  | 'amount'
  | 'km'
  | 'bar'
  | 'mm'
  | 'months'
  | 'percent'
  | 'min'

type Field = SettingField<MaintenanceSettingUnit>

export const MAINTENANCE_SETTING_FIELDS: Record<MaintenanceSettingsSection, readonly Field[]> = {
  targets: [
    { key: 'preventiveShareTargetPct', kind: 'number', unit: 'percent', min: 0, max: 100 },
    { key: 'preventiveCompletionTargetPct', kind: 'number', unit: 'percent', min: 0, max: 100 },
    { key: 'mttrTargetHours', kind: 'number', unit: 'h', min: 1, max: 720 },
    { key: 'mtbfTargetKm', kind: 'number', unit: 'km', min: 100, max: 1_000_000 }
  ],
  workshop: [
    { key: 'stations', kind: 'number', unit: 'count', min: 1, max: 50 },
    { key: 'hoursPerDay', kind: 'number', unit: 'h', min: 1, max: 24 },
    { key: 'workingDaysPerWeek', kind: 'number', unit: 'days', min: 1, max: 7 }
  ],
  labour: [{ key: 'hourlyRate', kind: 'number', unit: 'amount', min: 0, max: 1_000_000 }],
  downtimeCost: [
    { key: 'dayCost', kind: 'number', unit: 'amount', min: 0, max: 100_000_000 },
    { key: 'tractorDayCost', kind: 'optionalNumber', unit: 'amount', min: 0, max: 100_000_000 },
    { key: 'trailerDayCost', kind: 'optionalNumber', unit: 'amount', min: 0, max: 100_000_000 }
  ],
  service: [
    { key: 'noticeKm', kind: 'number', unit: 'km', min: 100, max: 10_000 },
    { key: 'noticeDays', kind: 'number', unit: 'days', min: 1, max: 90 },
    { key: 'noticeHours', kind: 'number', unit: 'h', min: 1, max: 1_000 }
  ],
  tyres: [
    { key: 'minPressureBar', kind: 'number', unit: 'bar', min: 1, max: 15 },
    { key: 'minTreadMm', kind: 'number', unit: 'mm', min: 0.5, max: 10 },
    { key: 'rotationKm', kind: 'number', unit: 'km', min: 5_000, max: 200_000 },
    { key: 'rotationMonths', kind: 'number', unit: 'months', min: 1, max: 24 }
  ],
  mobileTeam: [
    { key: 'interventionsPerMonth', kind: 'number', unit: 'count', min: 1, max: 500 },
    { key: 'resolutionRatePct', kind: 'number', unit: 'percent', min: 1, max: 100 },
    { key: 'averageTimeMin', kind: 'number', unit: 'min', min: 10, max: 1_440 },
    { key: 'checksPerMonth', kind: 'number', unit: 'count', min: 0, max: 1_000 }
  ]
}

export const DEFAULT_MAINTENANCE_SETTINGS: MaintenanceSettings = {
  targets: {
    preventiveShareTargetPct: 60,
    preventiveCompletionTargetPct: 90,
    mttrTargetHours: 24,
    mtbfTargetKm: 20_000
  },
  workshop: { stations: 2, hoursPerDay: 8, workingDaysPerWeek: 6 },
  labour: { hourlyRate: 10_000 },
  downtimeCost: { dayCost: 450_000, tractorDayCost: null, trailerDayCost: null },
  service: { noticeKm: 1_000, noticeDays: 15, noticeHours: 50 },
  tyres: { minPressureBar: 7, minTreadMm: 2, rotationKm: 30_000, rotationMonths: 6 },
  mobileTeam: {
    interventionsPerMonth: 10,
    resolutionRatePct: 90,
    averageTimeMin: 240,
    checksPerMonth: 20
  }
}

export function isMaintenanceSettingsSection(value: string): value is MaintenanceSettingsSection {
  return (MAINTENANCE_SETTINGS_SECTIONS as readonly string[]).includes(value)
}

export function maintenanceSettingsIssues(
  section: MaintenanceSettingsSection,
  values: Record<string, unknown>
) {
  return settingFieldIssues(MAINTENANCE_SETTING_FIELDS[section], values)
}
