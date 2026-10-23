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

export interface FleetSettings {
  drivingTime: DrivingTimeSettings
  geofencing: GeofencingSettings
  documents: DocumentSettings
}

export type FleetSettingsSection = keyof FleetSettings

export const FLEET_SETTINGS_SECTIONS = ['drivingTime', 'geofencing', 'documents'] as const

export type SettingUnit = 'min' | 'h' | 'm' | 'days'

export type SettingField =
  | { key: string; kind: 'number'; unit: SettingUnit; min: number; max: number }
  | { key: string; kind: 'optionalNumber'; unit: SettingUnit; min: number; max: number }
  | { key: string; kind: 'time' }

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
  documents: [{ key: 'defaultNoticeDays', kind: 'number', unit: 'days', min: 1, max: 180 }]
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
  documents: { defaultNoticeDays: 30 }
}

export type SettingIssue =
  | { field: string; code: 'required' }
  | { field: string; code: 'outOfRange'; min: number; max: number }
  | { field: string; code: 'invalidTime' }
  | { field: string; code: 'nightWindowIncomplete' }
  | { field: string; code: 'nightWindowEmpty' }

export function isFleetSettingsSection(value: string): value is FleetSettingsSection {
  return (FLEET_SETTINGS_SECTIONS as readonly string[]).includes(value)
}

/** Minutes since midnight, or null when the text is not a valid HH:MM time. */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

function fieldIssue(field: SettingField, value: unknown): SettingIssue | null {
  if (field.kind === 'time') {
    const text = typeof value === 'string' ? value : ''
    return text && timeToMinutes(text) === null ? { field: field.key, code: 'invalidTime' } : null
  }
  if (value == null || value === '') {
    return field.kind === 'number' ? { field: field.key, code: 'required' } : null
  }
  const number = Number(value)
  if (!Number.isFinite(number) || number < field.min || number > field.max) {
    return { field: field.key, code: 'outOfRange', min: field.min, max: field.max }
  }
  return null
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
  const issues = FLEET_SETTING_FIELDS[section]
    .map((field) => fieldIssue(field, record[field.key]))
    .filter((issue): issue is SettingIssue => issue !== null)
  if (section === 'drivingTime' && issues.length === 0) {
    const night = nightWindowIssue(values as DrivingTimeSettings)
    if (night) issues.push(night)
  }
  return issues
}
